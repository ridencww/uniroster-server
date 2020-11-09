import os
from datetime import datetime, timedelta
import re
import sys
import requests
import logging
import hvac
import ldap
import ldap.modlist
import ldap.resiter
import threading
from queue import Queue
import time
import mysql.connector
# from pyinstrument import Profiler


# pylint: disable=no-member,unused-variable

BASEDN = "dc=carnegielearning,dc=com"


class LdapObject(ldap.ldapobject.ReconnectLDAPObject,ldap.resiter.ResultProcessor):
  pass


def ResultIter(cursor, arraysize=5000):
    'An iterator that uses fetchmany to keep memory usage down'
    while True:
        results = cursor.fetchmany(arraysize)
        if not results:
            break
        for result in results:
            yield result


def getldap(trace_level=0):
    """return an open LDAP connection using credentials from Vault

    Args:
        host (string)
        dn (string)
        secret (string)

    Returns:
        object: ldap connection object
    """

    con = LdapObject(os.environ.get("ldaphost"), retry_max=3, trace_level=trace_level)
    con.bind(os.environ.get("ldapuser"), os.environ.get("ldappass"), ldap.AUTH_SIMPLE)
    if not con.result()[0] == 97:
        print(f"msg='LDAP bind error' con.result='{con.result()}")
        print(con.result())
        return None
    else:
        return con


def getdb(host, username, password, database=None):

    logging.debug(f"connecting to database: {username}:{host}")
    if database is not None:
        return mysql.connector.connect(
            host=host,
            user=username,
            password=password,
            database=database
        )
    else:
        return mysql.connector.connect(
            host=host,
            user=username,
            password=password
        )


def getschools(con, filterstr="(&(objectclass=school)(status=CURRENT_SCHOOL))"):
    """pull LDAP objects

    Arguments:
        con {object} -- ldap connection object
        filterstr {string} -- ldap query filter - default is active schools with a tenantid

    Returns: iterator
    """

    return ldapsearchgenerator(con, filterstr=filterstr)


def ldapsearch(con, filterstr="(&(objectclass=CLuser))"):
    logging.debug(f"msg='querying LDAP' filterstr='{filterstr}'")
    try:
        results = con.search_s(BASEDN, ldap.SCOPE_SUBTREE, filterstr)

    except ldap.NO_SUCH_OBJECT as e:
        logging.error(f"msg='ldap says no such object - possible connection error?' basedn='{BASEDN}' filter='{filterstr}' error='{e}' con={con.__dict__}")
        try:
            con = None
            logging.debug(f"msg='reconnecting to LDAP server'")
            con = getldap(trace_level=2)
            con.set_option(ldap.OPT_REFERRALS, 0)
            logging.debug(f"msg='retrying LDAP query' filterstr={filterstr}")
            results = con.search_s(BASEDN, ldap.SCOPE_SUBTREE, filterstr)

        except Exception as e:
            logging.error(f"msg='ldap still says no such object' basedn='{BASEDN}' filter='{filterstr}' error='{e}' con={con.__dict__}")
            return False

    except Exception as e:
        logging.error(f"msg='fatal error querying LDAP' basedn='{BASEDN}' filter='{filterstr}' error='{e}' con={con.__dict__}")
        return False

    return results


def ldapsearchgenerator(con, filterstr="(&(objectclass=CLuser))"):
    """build a generator that will return LDAP results - good for queries with a lot of results

    Args:
        con (ldap server connection)
        filterstr (str, optional): LDAP query filter. Defaults to "(&(objectclass=CLuser))".

    Returns:
        generator
    """

    logging.debug(f"msg='creating LDAP generator' filterstr={filterstr}")
    msg_id = con.search(BASEDN, ldap.SCOPE_SUBTREE, filterstr)
    gen = con.allresults(msg_id)
    logging.debug(f"msg='created LDAP generator'")
    return gen


def schemaname(tenantid):
    # remove the prefix if present
    tenantid = re.sub("tenant_", "", tenantid)
    # fix bad characters
    schema = re.sub("[- .']", "_", tenantid)
    # put the prefix on
    schema = f"tenant_{schema}"
    return schema


def dbinsert(dbh, sql, values, tenantid):
    """run sql to insert a record into a specific tenant's database schema

    Args:
        dbh (mysql database handler)
        sql (string): parameterized sql statement
        values (list): a list of values to insert into the sql statement
        tenantid (str): the tenant that we're writing to

    Returns:
        [type]: [description]
    """
    cursor = dbh.cursor()

    schema = schemaname(tenantid)

    if dbh.database != schema:
        try:
            logging.debug((f"msg='switching to schema' schema={schema}"))
            cursor.execute(f"USE {schema};")
        except:
            logging.error((f"msg='fatal error - could not change schema' schema={schema}"))
            # sys.exit(1)
            return False

    try:
        logging.debug((f"msg='running SQL query' schema={schema} sql='{sql}' values={values}"))
        result = cursor.execute(sql, values)
        return True
    except mysql.connector.Error as err:
        s = sql % tuple(values)
        logging.error(f"err='{err}' msg='fatal error - unable to run query' sql='{s}' values={values}")
        return False

    return False


def upsertorg(dbh, tenant, org):
    """insert an organization into the oneroster db

    Args:
        dbh (database handle object): the connection to the database
        tenant (string): the sourcedId of the district tenant - used as schema name
        org (dict): {sourcedId, status, dateLastModified, name, type, identifier, parentSourcedId}]
    """

    schema = schemaname(tenant)

    sql = "INSERT INTO `orgs` (`sourcedId`, `status`, `dateLastModified`, `name`, `type`, `identifier`, `parentSourcedId`) VALUES (%s, %s, %s, %s, %s, %s, %s) ON DUPLICATE KEY UPDATE status=%s, dateLastModified=%s, name=%s, type=%s, identifier=%s, parentSourcedId=%s"

    values = [
        org['sourcedId'],
        org['status'], org['dateLastModified'], org['name'], org['type'], org['identifier'], org['parentSourcedId'],
        org['status'], org['dateLastModified'], org['name'], org['type'], org['identifier'], org['parentSourcedId']
        ]

    try:
        result = dbinsert(dbh, sql, values, tenant)
        logging.debug(f"tenant={tenant} sourcedid={org['sourcedId']} msg='upserted org'")
        return True
    except KeyError as err:
        logging.error(f"err='database insert key error: {err}'")

    return False


def upsertclass(dbh, tenant, c):
    """insert a class into the oneroster db

    Args:
        dbh (database handler object)
        schema (string)
        c (dict): sourcedId, status, dateLastModified, title, grade, courseSourcedId, classCode, classType, location, schoolSourcedId, termSourcedId, subjects, tenantid

    """
    schema = schemaname(tenant)

    sql = "INSERT INTO `classes` (`sourcedId`, `status`, `dateLastModified`, `title`, `grade`, `courseSourcedId`, `classCode`, `classType`, `location`, `schoolSourcedId`, `termSourcedId`, `subjects`) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON DUPLICATE KEY UPDATE status=%s, dateLastModified=%s, title=%s, grade=%s, courseSourcedId=%s, classCode=%s, classType=%s, location=%s, schoolSourcedId=%s, termSourcedId=%s, subjects=%s"

    values = [
        c['sourcedId'],
        c['status'], c['dateLastModified'], c['title'], c['grade'], c['courseSourcedId'], c['classCode'], c['classType'], c['location'], c['schoolSourcedId'], c['termSourcedId'], c['subjects'],
        c['status'], c['dateLastModified'], c['title'], c['grade'], c['courseSourcedId'], c['classCode'], c['classType'], c['location'], c['schoolSourcedId'], c['termSourcedId'], c['subjects']
    ]

    logging.debug(f"class={c['sourcedId']} msg='class updated'")
    dbinsert(dbh, sql, values, schema)

    return


def upsertuser(dbh, tenant, c):
    """insert a class into the oneroster db

    Args:
        dbh (database handler object)
        values (list):  thirteen
        sourcedId, status, dateLastModified, title, grade, courseSourcedId, classCode, classType, location, schoolSourcedId, termSourcedId, subjects

    """
    schema = schemaname(tenant)

    sql = "INSERT INTO `users` (`sourcedId`, `status`, `dateLastModified`, `orgSourcedIds`, `role`, `username`, `userId`, `givenName`, `familyName`, `identifier`, `email`, `sms`, `phone`, `agents`) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON DUPLICATE KEY UPDATE status=%s, dateLastModified=%s, orgSourcedIds=%s, role=%s, username=%s, userId=%s, givenName=%s, familyName=%s, identifier=%s, email=%s, sms=%s, phone=%s, agents=%s"

    values = [
        c['sourcedId'],
        c['status'], c['dateLastModified'], c['orgSourcedIds'], c['role'], c['username'], c['userId'], c['givenName'], c['familyName'], c['identifier'], c['email'], c['sms'], c['phone'], c['agents'],
        c['status'], c['dateLastModified'], c['orgSourcedIds'], c['role'], c['username'], c['userId'], c['givenName'], c['familyName'], c['identifier'], c['email'], c['sms'], c['phone'], c['agents'],
    ]

    logging.debug(f"user={c['uuid']} msg='user updated'")
    return dbinsert(dbh, sql, values, schema)


def upsertenrollment(dbh, tenant, values):
    """insert an enrollment into the oneroster db

    Args:
        dbh (database handler object)
        values (list):  thirteen
        sourcedId, status, dateLastModified, title, grade, courseSourcedId, classCode, classType, location, schoolSourcedId, termSourcedId, subjects

    """
    schema = schemaname(tenant)

    sql = "INSERT INTO `enrollments` (`sourcedId`, `classSourcedId`, `schoolSourcedId`, `userSourcedId`, `role`, `status`, `dateLastModified`) VALUES (%s, %s, %s, %s, %s, %s, %s) ON DUPLICATE KEY UPDATE classSourcedId=%s, schoolSourcedId=%s, userSourcedId=%s, role=%s, status=%s, dateLastModified=%s "

    vals = values + values[1:]

    logging.debug(f"enrollment={values[0]} msg='enrollment updated'")
    return dbinsert(dbh, sql, tuple(vals), schema)


def upsertterm(dbh, tenant, t):
    """insert a term into the oneroster db

    Args:
        dbh (database handler object)
        schema (string)
        values (dict):  `sourcedId`, `status`, `dateLastModified`, `title`, `type`, `startDate`, `endDate`, `parentSourcedId`

    """
    schema = schemaname(tenant)

    sql = "INSERT INTO `academicsessions` (`sourcedId`, `status`, `dateLastModified`, `title`, `type`, `startDate`, `endDate`, `parentSourcedId`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) ON DUPLICATE KEY UPDATE status=%s, dateLastModified=%s, title=%s, type=%s, startDate=%s, endDate=%s, parentSourcedId=%s"

    values = [
        t['sourcedId'],
        t['status'], t['dateLastModified'], t['title'], t['type'], t['startDate'], t['endDate'], t['parentSourcedId'],
        t['status'], t['dateLastModified'], t['title'], t['type'], t['startDate'], t['endDate'], t['parentSourcedId'],
    ]

    logging.debug(f"term={t['sourcedId']} msg='term updated'")
    return dbinsert(dbh, sql, values, schema)


def upsertcourse(dbh, tenant, c):
    """upsert a course into the oneroster db

    Args:
        dbh (database handler object)
        schema (string)
        c (dict)

    """
    schema = schemaname(tenant)

    sql = "INSERT INTO `courses` (`sourcedId`, `status`, `dateLastModified`, `schoolYearId`, `metadata#duration`, `title`, `courseCode`, `grade`, `orgSourcedId`, `subjects`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) ON DUPLICATE KEY UPDATE status=%s, dateLastModified=%s, schoolYearId=%s, `metadata#duration`=%s, title=%s, courseCode=%s, grade=%s, orgSourcedId=%s, subjects=%s"

    values = [
        c['sourcedId'], c['status'], c['dateLastModified'], c['schoolYearId'], c['metadata#duration'], c['title'], c['courseCode'], c['grade'], c['orgSourcedId'], c['subjects'],
        c['status'], c['dateLastModified'], c['schoolYearId'], c['metadata#duration'], c['title'], c['courseCode'], c['grade'], c['orgSourcedId'], c['subjects'],
    ]

    logging.debug(f"course={c['sourcedId']} msg='course updated'")
    return dbinsert(dbh, sql, values, schema)


def dbquery(dbh, query):
    """run a simple database query and return a list of results

    Args:
        dbh (database handler object)
        query (string): ready-to-run sql query

    Returns:
        list: results
    """
    cursor = dbh.cursor()

    logging.debug(f"querying database: {query}")
    cursor.execute(query)
    results = []
    for row in ResultIter(cursor):
        results.append(row)

    return results


def makeschema(dbh, tenantid, district_name="", dropfirst=False):
    """create a new database schema for a particular tenant and build tables in it
    Args:
        dbh (mysql database server handle)
        schema (string): the tenantid will be used as the name for the new schema

    Returns:
        bool: returns the result of the db commit
    """
    logging.debug(f"tenant={tenantid} msg='checking tenant schema'")

    schema = schemaname(tenantid)
    cursor = dbh.cursor()

    if dropfirst is True:
        logging.debug(f"tenantid={tenantid} msg='dropping database schema: {schema}'")
        sql = f"drop database if exists `{schema}`;"
        cursor.execute(sql)

    if schema in getschemas(dbh):
        logging.debug(f"tenant={tenantid} msg='tenant schema exists'")
    else:

        try:
            cursor = dbh.cursor()
            logging.warn(f"tenantid={tenantid} msg='creating database schema: {schema}'")
            sql = f"create database if not exists `{schema}`;"
            cursor.execute(sql)
            dbh.commit()
        except mysql.connector.Error as err:
            logging.error(f"err='{err}' msg='fatal error - unable to create schema' schema={schema} sql='{sql % schema}'")
            return False

    try:
        sql = f"CREATE TABLE IF NOT EXISTS `{schema}`.`orgs` ( `sourcedId` varchar(255) NOT NULL, `status` varchar(255) DEFAULT NULL, `dateLastModified` varchar(255) DEFAULT NULL, `name` varchar(255) DEFAULT NULL, `type` varchar(255) DEFAULT NULL, `identifier` varchar(255) DEFAULT NULL, `metadata#classification` varchar(255) DEFAULT NULL, `metadata#gender` varchar(255) DEFAULT NULL, `metadata#boarding` varchar(255) DEFAULT NULL, `parentSourcedId` varchar(255) DEFAULT NULL, PRIMARY KEY (`sourcedId`) ) ENGINE=InnoDB DEFAULT CHARSET=utf8;"
        logging.debug(f"tenantid={schema} msg='creating orgs table'")
        dbquery(dbh, sql)
    except mysql.connector.Error as err:
        logging.error(f"err='{err}' msg='fatal error - database query error' schema={schema} sql='{sql}'")
        # sys.exit(1)
        return False

    try:
        sql = ( f"CREATE TABLE IF NOT EXISTS `{schema}`.`academicsessions` ( "
            "`sourcedId` varchar(255) NOT NULL, "
            "`status` varchar(255) DEFAULT NULL, "
            "`dateLastModified` varchar(255) DEFAULT NULL, "
            "`title` varchar(255) DEFAULT NULL, "
            "`type` varchar(255) DEFAULT NULL, "
            "`startDate` varchar(255) DEFAULT NULL, "
            "`endDate` varchar(255) DEFAULT NULL, "
            "`parentSourcedId` varchar(255) DEFAULT NULL, "
            "INDEX s_ind (sourcedId),"
            "INDEX p_ind (parentSourcedId)"
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8;" )

        logging.debug(f"tenantid={schema} msg='creating academicsessions table'")
        dbquery(dbh, sql)

        logging.debug(f"tenantid={schema} msg='setting all existing records: tobedeleted'")
        dbquery(dbh, f"update `{schema}`.`academicsessions` set status='tobedeleted'")
        dbquery(dbh, sql)
    except mysql.connector.Error as err:
        logging.error(f"err='{err}' msg='fatal error on database query' schema={schema} sql='{sql}'")
        # sys.exit(1)
        return False

    try:
        sql = f"CREATE TABLE IF NOT EXISTS `{schema}`.`classes` ( `sourcedId` varchar(255) NOT NULL, `status` varchar(255) DEFAULT NULL, `dateLastModified` varchar(255) DEFAULT NULL, `title` varchar(255) DEFAULT NULL, `grade` varchar(255) DEFAULT NULL, `courseSourcedId` varchar(255) DEFAULT NULL, `classCode` varchar(255) DEFAULT NULL, `classType` varchar(255) DEFAULT NULL, `location` varchar(255) DEFAULT NULL, `schoolSourcedId` varchar(255) DEFAULT NULL, `termSourcedId` varchar(255) DEFAULT NULL, `subjects` varchar(255) DEFAULT NULL, PRIMARY KEY (`sourcedId`) ) ENGINE=InnoDB DEFAULT CHARSET=utf8;"
        logging.debug(f"tenantid={schema} msg='creating classes table'")
        dbquery(dbh, sql)
    except mysql.connector.Error as err:
        logging.error(f"err='{err}' msg='fatal error on database query' schema={schema} sql='{sql}'")
        # sys.exit(1)
        return False

    try:
        sql = f"CREATE TABLE IF NOT EXISTS `{schema}`.`courses` ( `sourcedId` varchar(255) NOT NULL, `status` varchar(255) DEFAULT NULL, `dateLastModified` varchar(255) DEFAULT NULL, `schoolYearId` varchar(255) DEFAULT NULL, `metadata#duration` varchar(255) DEFAULT NULL, `title` varchar(255) DEFAULT NULL, `courseCode` varchar(255) DEFAULT NULL, `grade` varchar(255) DEFAULT NULL, `orgSourcedId` varchar(255) DEFAULT NULL, `subjects` varchar(255) DEFAULT NULL, PRIMARY KEY (`sourcedId`) ) ENGINE=InnoDB DEFAULT CHARSET=utf8;"
        logging.debug(f"tenantid={schema} msg='creating courses table'")
        dbquery(dbh, sql)
    except mysql.connector.Error as err:
        logging.error(f"err='{err}' msg='fatal error on database query' schema={schema} sql='{sql}'")
        # sys.exit(1)
        return False

    try:
        sql = f"CREATE TABLE IF NOT EXISTS `{schema}`.`demographics` ( `userSourcedId` varchar(255) NOT NULL, `status` varchar(255) DEFAULT NULL, `dateLastModified` varchar(255) DEFAULT NULL, `birthdate` varchar(255) DEFAULT NULL, `sex` varchar(255) DEFAULT NULL, `americanIndianOrAlaskaNative` varchar(255) DEFAULT NULL, `asian` varchar(255) DEFAULT NULL, `blackOrAfricanAmerican` varchar(255) DEFAULT NULL, `nativeHawaiianOrOtherPacificIslander` varchar(255) DEFAULT NULL, `white` varchar(255) DEFAULT NULL, `demographicRaceTwoOrMoreRaces` varchar(255) DEFAULT NULL, `hispanicOrLatinoEthnicity` varchar(255) DEFAULT NULL, `countryOfBirthCode` varchar(255) DEFAULT NULL, `stateOfBirthAbbreviation` varchar(255) DEFAULT NULL, `cityOfBirth` varchar(255) DEFAULT NULL, `publicSchoolResidenceStatus` varchar(255) DEFAULT NULL, PRIMARY KEY (`userSourcedId`) ) ENGINE=InnoDB DEFAULT CHARSET=utf8;"
        logging.debug(f"tenantid={schema} msg='creating demographics table'")
        dbquery(dbh, sql)
    except mysql.connector.Error as err:
        logging.error(f"err='{err}' msg='fatal error on database query' schema={schema} sql='{sql}'")
        # sys.exit(1)
        return False

    try:
        sql = f"CREATE TABLE IF NOT EXISTS `{schema}`.`enrollments` ( `sourcedId` varchar(255) NOT NULL, `classSourcedId` varchar(255) DEFAULT NULL, `schoolSourcedId` varchar(255) DEFAULT NULL, `userSourcedId` varchar(255) DEFAULT NULL, `role` varchar(255) DEFAULT NULL, `status` varchar(255) DEFAULT NULL, `dateLastModified` varchar(255) DEFAULT NULL, `primary` varchar(255) DEFAULT NULL, PRIMARY KEY (`sourcedId`), KEY `classSourcedId_idx` (`classSourcedId`), KEY `schoolSourcedId_idx` (`schoolSourcedId`), KEY `userSourcedId_idx` (`userSourcedId`) ) ENGINE=InnoDB DEFAULT CHARSET=utf8;"
        logging.debug(f"tenantid={schema} msg='creating enrollments table'")
        dbquery(dbh, sql)
    except mysql.connector.Error as err:
        logging.error(f"err='{err}' msg='fatal error on database query' schema={schema} sql='{sql}'")
        # sys.exit(1)
        return False

    try:
        sql = f"CREATE TABLE IF NOT EXISTS `{schema}`.`users` ( `sourcedId` varchar(255) NOT NULL, `status` varchar(255) DEFAULT NULL, `dateLastModified` varchar(255) DEFAULT NULL, `orgSourcedIds` varchar(1024) DEFAULT NULL, `role` varchar(255) DEFAULT NULL, `username` varchar(255) DEFAULT NULL, `userId` varchar(255) DEFAULT NULL, `givenName` varchar(255) DEFAULT NULL, `familyName` varchar(255) DEFAULT NULL, `identifier` varchar(255) DEFAULT NULL, `email` varchar(255) DEFAULT NULL, `sms` varchar(255) DEFAULT NULL, `phone` varchar(255) DEFAULT NULL, `agents` varchar(255) DEFAULT NULL, PRIMARY KEY (`sourcedId`) ) ENGINE=InnoDB DEFAULT CHARSET=utf8;"
        logging.debug(f"tenantid={schema} msg='creating users table'")
        dbquery(dbh, sql)
    except mysql.connector.Error as err:
        logging.error(f"err='{err}' msg='fatal error on database query' schema={schema} sql='{sql}'")
        # sys.exit(1)
        return False

    try:
        sql = f"CREATE TABLE IF NOT EXISTS `{schema}`.`metadata` ( `id` int(11) NOT NULL AUTO_INCREMENT, `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, `event` varchar(128) NOT NULL DEFAULT '', `lastversion` bigint(20) DEFAULT '0', `duration` varchar(128) DEFAULT NULL, PRIMARY KEY (`id`) ) ENGINE=InnoDB DEFAULT CHARSET=latin1;"
        logging.debug(f"tenantid={schema} msg='creating metadata table'")
        dbquery(dbh, sql)
    except mysql.connector.Error as err:
        logging.error(f"err='{err}' msg='fatal error on database query' schema={schema} sql='{sql}'")
        # sys.exit(1)
        return False

    try:
        # insert an org record in the new schema for the district
        org = {
            'sourcedId'         : f"{tenantid}",
            'status'            : 'active',
            'dateLastModified'  : '',
            'name'              : district_name,
            'type'              : 'district',
            'identifier'        : tenantid,
            'classification'    : '',
            'gender'            : '',
            'boarding'          : '',
            'parentSourcedId'   : ''
        }
        upsertorg(dbh, tenantid, org)

    except mysql.connector.Error as err:
        logging.error(f"err='{err}' msg='fatal error on database query' schema={schema} sql='{sql}'")
        # sys.exit(1)
        return False

    dbh.commit()
    return


def getschemas(dbh):
    """pull a list of current schemas in the database

    Args:
        dbh (mysql database handle object)

    Returns:
        list: list of names of schema as strings
    """
    return [x[0] for x in dbquery(dbh, "show databases;")]


def makeorg(onerosterdb, school, partynum, seen_schools, schemas, districtname, seen_tenants):

    """create and upsert an organization record in the oneroster database

        school (dict): school attributes
        district_party_numbers (dict): school uuid to district party number - based on the all_schools.csv
        seen_schools (dict): school sourcedId to tenantId #TODO confirm this?
        schemas (list): the database schemas, one per tenant
        district_names (list): from all_schools.csv
        onerosterdb (database handle): connected to the oneroster database
        seen_tenants (list): the tenants that we've seen already
    """
    org = {}
    org['dateLastModified'] = ""
    org['boarding'] = ""
    org['classification'] = ""
    org['gender'] = ""
    org['status'] = "active"
    org['type'] = "school"

    org['sourcedId'] = school[1]['uuid'][0].decode()
    org['tenantid'] = org['sourcedId'] # use the school uuid as default - we'll replace it if we can
    org['parentSourcedId'] = org['sourcedId']
    org['name'] = school[1]['description'][0].decode() if 'description' in school[1] else org['sourcedId']

    if 'externalid' not in school[1]:
        org['identifier'] = org['sourcedId']
        logging.debug(f"schuuid={org['sourcedId']} msg='school has no externalid - using schuuid for externalid'")
    else:
        org['identifier'] = school[1]['externalid'][0].decode()

    if 'tenantID' in school[1]:
        # if we can, use the tenantid from LDAP
        org['tenantid'] = school[1]['tenantID'][0].decode()
        org['parentSourcedId'] = school[1]['tenantID'][0].decode()
    elif partynum is not None and partynum != '':
        org['tenantid'] = f"partynum_{partynum}"
        org['parentSourcedId'] = org['tenantid']
    else:
        org['tenantid'] = org['sourcedId']
        org['parentSourcedId'] = org['sourcedId']

    # FIXME For schools without a district, we're using the schuuid as the tenantid.
    # That means we created a schema named tenant_<schuuid> and created a district
    # entry in the org table.  That district entry has sourcedId <schuuid>. When we
    # create the school's record in the org table, it has the same sourcedId, so it
    # upserts over the district record, replacing it.  We have a school org, but no
    # district org, which is probably fine but bothers me.  It shouldn't upsert
    # over the district record because the different types, but I haven't figured
    # it out yet.

    parentid = org['tenantid']
    seen_schools[org['sourcedId']] = parentid

    schema = schemaname(parentid)

    if schema not in schemas:
        # create a schema for this district
        makeschema(onerosterdb, parentid, district_name=districtname, dropfirst=True)
        schemas.append(parentid)
    else:
        logging.debug(f"tenantid={parentid} schema={schema} msg='schema exists'")

    if parentid not in seen_tenants:
        seen_tenants[parentid] = []

    seen_tenants[parentid].append(org['sourcedId'])

    # add the school to the tenant
    try:
        result = upsertorg(onerosterdb, org['tenantid'], org)
        if result is False:
            return False
        else:
            onerosterdb.commit()
            return True
    except Exception as e:
        logging.error(f"tenant={parentid} org={org['sourcedId']} msg='unable to update org' exception='{e}'")
        return False


def makeclass(klass, tenantid, academicSessions, courses, onerosterdb):

    # using the field names from the K12 db table
    Klass_RID, Active, DisplayName, EndDate, KlassId, KlassProfile, KlassType, SchoolId, StandardSet, StartDate, SyllabusId, ThemeId, Version, ImplementationType, TeamProject, ExternalAssessmentType, AssessmentApplied, IsDeleted, DeletedOn, KlassKey = klass

    c = {}
    c['grade'] = ""
    c['dateLastModified'] = ""
    c['location'] = ""
    c['subjects'] = ""
    c['metadata#duration'] = ""
    c['term'] = "term"
    c['schoolYearId'] = "2020"

    c['sourcedId'] = KlassId
    c['tenantid'] = tenantid

    c['title'] = DisplayName
    c['courseTitle'] = DisplayName

    c['classCode'] = KlassProfile
    c['classType'] = KlassType

    c['courseSourcedId'] = SyllabusId
    c['courseCode'] = SyllabusId

    c['schoolSourcedId'] = SchoolId
    c['orgSourcedId'] = SchoolId

    s = "active" if Active == 1 else "tobedeleted"
    c['status'] = s
    c['courseStatus'] = s

    c['termSourcedId'] = f"term-{StartDate}-{EndDate}"
    c['startDate'] = StartDate
    c['endDate'] = EndDate

    logging.debug(f"action='upsert class' sourcedId={KlassId} title='{c['title']} course='{c['courseSourcedId']}' school='{c['schoolSourcedId']}'")
    upsertclass(onerosterdb, c['tenantid'], c)

    # create terms in the academicSessions table
    if c['termSourcedId'] not in academicSessions:
        logging.debug(f"action='upsert term' termSourcedId={c['termSourcedId']} school='{c['schoolSourcedId']}")

        upsertterm(onerosterdb, c['tenantid'], {
            'termSourcedId'     : c['termSourcedId'],
            'sourcedId'         : c['termSourcedId'],
            'status'            : 'active',
            'dateLastModified'  : c['dateLastModified'],
            'type'              : 'term',
            'title'             : c['termSourcedId'],
            'startDate'         : c['startDate'],
            'endDate'           : c['endDate'],
            'schoolSourcedId' :   c['schoolSourcedId'],
            'parentSourcedId' :   c['schoolSourcedId']
        })

        academicSessions.append(c['termSourcedId'])

    # create courses in the appropriate table
    if c['courseSourcedId'] not in courses:
        logging.debug(f"action='upsert course' courseSourcedId={c['courseSourcedId']} school='{c['schoolSourcedId']}")

        # c['sourcedId'], c['status'], c['dateLastModified'], c['schoolYearId'], c['metadata#duration'], c['title'], c['courseCode'], c['grade'], c['orgSourcedId'], c['subjects']

        upsertcourse(onerosterdb, c['tenantid'], {
            'sourcedId'         : c['courseSourcedId'],
            'status'            : c['status'],
            'dateLastModified'  : c['dateLastModified'],
            'schoolYearId'      : c['schoolYearId'],
            'metadata#duration' : c['metadata#duration'],
            'title'             : c['title'],
            'courseCode'        : c['courseCode'],
            'grade'             : c['grade'],
            'orgSourcedId'      : c['orgSourcedId'],
            'subjects'           : c['subjects'],
            })

        courses.append(c['courseSourcedId'])

    return


def makeenrollment(enrollment, classSourcedId, schoolSourcedId, tenantSourcedId, users, con, onerosterdb):

    isinstructor, userSourcedId, rid = enrollment

    role = "instructor" if isinstructor == 1 else "student"
    enrollmentSourcedId = f"{classSourcedId}+{userSourcedId}"
    status = "active"
    dateLastModified = ""
    enrollmentprimary = "null"

    logging.debug(f"action='upsert enrollment' user={userSourcedId} classSourcedId={classSourcedId} school={schoolSourcedId} role={role}")

    upsertenrollment(onerosterdb, tenantSourcedId, (enrollmentSourcedId, classSourcedId, schoolSourcedId, userSourcedId, role, status, dateLastModified))

    return


def getusers(schuuid, con):

    filterstr = f"(&(objectclass=CLuser)(schuuid={schuuid}))"

    results = ldapsearch(con, filterstr=filterstr)
    if results is False:
        logging.error(f"msg='getusers failed' filterstr={filterstr} con={con.__dict__}")
        return False

    if len(results) == 0:
        logging.debug(f"schuuid={schuuid} msg='no users found for school' filterstr='{filterstr}'")
        return {}

    users = {}
    for row in results:
        dn, attrs = row
        uuid = attrs["uuid"][0].decode()

        users[uuid] = attrs
        users[uuid]['sourcedId'] = uuid
        users[uuid]['orgSourcedIds'] = " ".join([x.decode() for x in attrs['schuuid']])
        users[uuid]['userId'] = attrs["uid"][0].decode()
        users[uuid]['username'] = attrs["uid"][0].decode()
        users[uuid]['identifier'] = attrs['externalid'][0].decode() if 'externalid' in attrs else ""

        users[uuid]['givenName'] = attrs['givenName'][0].decode()
        users[uuid]['familyName'] = attrs['sn'][0].decode()

        users[uuid]['email'] = attrs['mail'][0].decode() if 'mail' in attrs else ""
        users[uuid]['sms'] = ""
        users[uuid]['phone'] = ""
        users[uuid]['agents'] = ""
        users[uuid]['status'] = "active"
        users[uuid]['dateLastModified'] = ""

    return users


def populate_tenant(tenant, schools, force=False):
    # profiler = Profiler()
    # profiler.start()

    threadname = threading.current_thread().name

    tenant_time = time.time()
    schema = schemaname(tenant)
    onerosterdb = getdb(os.environ.get('ordbhost'), os.environ.get('ordbuser'), os.environ.get('ordbpass'), database=schema)

    # check when we last updated this tenant
    updated_recently = False
    metadata = dbquery(onerosterdb, "select * from metadata where event='full roster update' order by timestamp desc limit 1;")
    timestamp = "never"
    if len(metadata) == 1:
        rowid, timestamp, event, lastversion, duration = metadata[0]
        updated_recently = timestamp > datetime.utcnow() - timedelta(days=3)

    if force is False and timestamp == "never":
        logging.info(f"tenant={tenant} msg='tenant has been updated before, prioritizing new tenants first, requeuing'")
        return False
    else:
        logging.info(f"tenant={tenant} school_count={len(schools)} last_updated='{timestamp}' msg='starting tenant'")

    k12db = getdb(os.environ.get('k12dbhost'), os.environ.get('k12dbuser'), os.environ.get('k12dbpass'), database="k12db")

    con = getldap()

    academicSessions = []
    courses = []
    classes = []
    tenant_users = []
    school_class_rids = {}

    lastVersion = 0

    threading.current_thread().name = tenant
    for school in schools:
        logging.debug(f"tenant={tenant} school={school} msg='pulling classes from k12db'")

        klasses = dbquery(k12db, f"select * from KLASS where SchoolId = '{school}' and isDeleted IS NULL")
        logging.debug(f"tenant={tenant} school={school} msg='school has {len(klasses)} classes'")

        users = getusers(school, con)
        badusers = []
        if users is False:
            logging.error(f"tenant={tenant} school={school} msg='LDAP error while pulling users for this school - tenant will be retried")
            return False

        for klass in klasses:
            Klass_RID, Active, DisplayName, EndDate, KlassId, KlassProfile, KlassType, SchoolId, StandardSet, StartDate, SyllabusId, ThemeId, Version, ImplementationType, TeamProject, ExternalAssessmentType, AssessmentApplied, IsDeleted, DeletedOn, KlassKey = klass

            if Version > lastVersion:
                lastVersion = Version

            # we have a list of classes, not courses, so we'll build both from class data
            makeclass(klass, tenant, academicSessions, courses, onerosterdb)

            enrollment_results = dbquery(k12db, f"select * from KLASS_ENROLLMENT where Klass_RID = '{Klass_RID}';")
            logging.debug(f"tenant={tenant} school={school} classid={KlassId} msg='{len(enrollment_results)} enrollments'")

            for enrollment in enrollment_results:
                isinstructor, userSourcedId, rid = enrollment
                enrollmentSourcedId=f"{Klass_RID}+{userSourcedId}"

                if userSourcedId in tenant_users:
                    makeenrollment(enrollment, KlassId, school, tenant, users, con, onerosterdb)
                if userSourcedId in badusers:
                    logging.debug(f"schuuid={school} uuid={userSourcedId} enrollment='{enrollmentSourcedId}' msg='user not in LDAP for this school'")
                elif userSourcedId in users:
                    user = users[userSourcedId]
                    user['role'] = "instructor" if isinstructor == 1 else "student"
                    success = upsertuser(onerosterdb, tenant, user)
                    logging.debug(f"uuid='{userSourcedId}' msg='user upserted'")
                    if success:
                        tenant_users.append(userSourcedId)
                        makeenrollment(enrollment, KlassId, school, tenant, users, con, onerosterdb)
                        logging.debug(f"enrollment='{enrollmentSourcedId}' msg='enrollment upserted'")
                else:
                    logging.warning(f"enrollment='{enrollmentSourcedId}' uuid={userSourcedId} schuuid={school} msg='user not in LDAP for this school'")
                    badusers.append(userSourcedId)


            logging.debug(f"class={KlassId} class_rid={Klass_RID} enrollments={len(enrollment_results)}")

    elapsed = time.time() - tenant_time

    sql = "insert into metadata (event, lastversion, duration) values (%s, %s, %s)"

    values = ["full roster update", lastVersion, elapsed]
    dbinsert(onerosterdb, sql, values, tenant)

    onerosterdb.commit()
    threading.current_thread().name = threadname

    onerosterdb.close()
    k12db.close()
    con = None
    del con

    logging.info(f"tenant={tenant} school_count={len(schools)} class_count={len(klasses)} user_count={len(tenant_users)} msg='completed in {elapsed} seconds")
    # profiler.stop()

    # with open("output.html", "w") as outfile:
    #     outfile.write(profiler.output_html())

    return True