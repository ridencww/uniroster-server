#!/usr/bin/env python
""" pull school/user/term/enrollment/course/class data from
    LDAP and the k12db, update the oneroster database"""
# pylint: disable=unused-variable

import logging
from threading import Thread, Lock, Event
import queue
import time
from datetime import datetime
import os
import sys
import csv
from . import helpers


if "VERSION" in os.environ:
    VERSION = os.environ['VERSION']
else:
    VERSION = "unset"

class threadWorker(Thread):
    def __init__(self, workqueue, runfunction, name):
        Thread.__init__(self, name=name)
        self.workqueue = workqueue
        self.function = runfunction
        self.exceptioncount = 0

    def run(self):
        while True:
            if self.exceptioncount > 5:
                logging.error(f"msg='this thread has produced {self.exceptioncount} exceptions - killing thread")
                return

            try:
                args = self.workqueue.get(timeout=10)
            except:
                logging.debug(f"tenant queue empty - worker exiting")
                return

            try:
                if self.function(*args):
                    logging.debug(f"tenant={args[0]} msg='completed successfully'")
                else:
                    args = args + ("force=True",)
                    logging.warning(f"tenant={args[0]} msg='tenant exited without finishing, putting it back on the queue'")
                    self.workqueue.put(args)
            except Exception as e:
                self.exceptioncount = self.exceptioncount + 1
                logging.error(f"exception={e} msg='this thread has produced {self.exceptioncount} exceptions so far")

            finally:
                self.workqueue.task_done()
                # logging.info( f"msg='{str(self.function.__name__)}: {self.workqueue.unfinished_tasks} remaining'" )
                pass

        return


class orgWorker(Thread):
    def __init__(self, workqueue, runfunction, name):
        Thread.__init__(self, name=name)
        self.workqueue = workqueue
        self.function = runfunction

    def run(self):
        self.ordb = helpers.getdb(
            os.environ.get("ordbhost"),
            os.environ.get("ordbuser"),
            os.environ.get("ordbpass"),
        )
        while True:
            try:
                args = self.workqueue.get(timeout=10)
            except queue.Empty:
                logging.debug(f"orgs queue empty - worker exiting")
                return
            except Exception as e:
                logging.debug(f"exception='{e}'")

            try:
                result = self.function(self.ordb, *args)
                if result is False:
                    raise Exception("Bad things")
            except Exception as e:
                logging.debug(f"org worker exception='{e}'")

            finally:
                self.workqueue.task_done()
                # logging.info(
                #     f"msg='{str(self.function.__name__)}: {self.workqueue.unfinished_tasks} remaining'"
                # )
        return


class Oneimporter:
    @staticmethod
    def run():
        wholetime = time.time()
        level = os.environ['loglevel'].upper() if 'loglevel' in os.environ else "INFO"

        logging.basicConfig(
            level=level,
            format="%(asctime)s lvl=%(levelname)s thr=%(threadName)s %(message)s")

        domain = os.environ.get("domain")

        logging.info(f"domain={domain} ver='{VERSION}' msg='oneimporter logging started'")

        logging.info(
            f"msg='connecting to k12 database' host={os.environ.get('k12dbhost')} user={os.environ.get('k12dbuser')}"
        )
        k12db = helpers.getdb(
            os.environ.get("k12dbhost"),
            os.environ.get("k12dbuser"),
            os.environ.get("k12dbpass"),
            database="k12db",
        )

        logging.info(
            f"msg='connecting to oneroster database' host={os.environ.get('ordbhost')} user={os.environ.get('ordbuser')}"
        )
        onerosterdb = helpers.getdb(
            os.environ.get("ordbhost"),
            os.environ.get("ordbuser"),
            os.environ.get("ordbpass"),
        )

        logging.info(f"msg='connecting to LDAP' url={os.environ.get('ldaphost')}")
        con = helpers.getldap()

        # FIXME we're relying on a CSV from the splunk server rather than a live connection to the Oracle database for district party numbers.
        # if a school doesn't already have a tenantid, we use the district party number.
        district_lookup = {}
        with open("all_schools.csv") as csvfile:
            for row in csv.DictReader(csvfile):
                if row["DISTRICT_PARTY_NUMBER"]: next
                district_lookup[row["uuid"]] = {
                    "partynum": row["DISTRICT_PARTY_NUMBER"],
                    "name": row["DISTRICT_NAME"],
                }

        # pull a list of schools from LDAP - we can limit this to one tenant or run everything.
        # FIXME potential LDAP injection in the 'district' envvar

        target_district = (
            os.environ.get("district") if "district" in os.environ and os.environ['district'] != "" else None
        )

        if target_district is not None:
            filterstr = f"(&(objectclass=school)(status=CURRENT_SCHOOL)(tenantid={target_district}))"
        else:
            filterstr = "(&(objectclass=school)(status=CURRENT_SCHOOL))"

        logging.info(f"msg='pulling schools from LDAP to build tenant schemas and populate schools in the orgs tables' filter={filterstr}")
        # we'll use the list of schools to create a schema for each tenant, create the tables within the schemas, and populate the orgs table

        orgstart = time.time()
        orgqueue = queue.Queue()
        schemas = [x[0] for x in helpers.dbquery(onerosterdb, "show databases;")]

        # seen_tenants will be populated by helpers.makeorg as {tenantid: [schoolSourcedId, ...]}
        seen_tenants = {}

        # seen_schools will be populated by helpers.makeorg as {schoolSourcedId: tenantId}
        seen_schools = {}

        ldap_school_search = helpers.getschools(con, filterstr=filterstr)
        for res_type, res_data, res_msgid, res_controls in ldap_school_search:
            school = res_data[0]
            schuuid = school[1]["uuid"][0].decode()

            if schuuid in district_lookup:
                districtpartynum = district_lookup[schuuid]["partynum"]
                districtname = district_lookup[schuuid]["name"]
            else:
                districtpartynum = schuuid
                districtname = None

            # The worker threads will populate seen_schools and seen_tenants as they handle schools.
            logging.debug(f"school='{schuuid} msg='added school to orgs queue'")
            orgqueue.put((school, districtpartynum, seen_schools, schemas, districtname, seen_tenants))

        org_count = orgqueue.qsize()

        if org_count < 1:
            logging.info(f"filterstr={filterstr} msg='no schools found for tenant'")
            return

        workers = 1 if orgqueue.qsize() < 8 else 8

        if workers > 1:
            logging.info(f"starting {workers} worker threads to process {org_count} orgs")
        for x in range(workers):
            worker = orgWorker(orgqueue, helpers.makeorg, name=f"org-{x}")
            worker.daemon = True
            worker.start()

        orgqueue.join() # FIXME if the workers all error out, we will never get past this join

        elapsed = time.time() - orgstart
        logging.info(f"msg='schemas and orgs completed in {elapsed} seconds'")

        workqueue = queue.Queue()
        # using the tenant and schools lists from the orgs, queue up tenants to process
        for tenant in seen_tenants:
            schools = seen_tenants[tenant]
            if len(schools) > 0:
                workqueue.put((tenant, schools))

        workers = 8 if len(seen_tenants) > 8 else len(seen_tenants)

        if workers > 1:
            logging.info(f"msg='starting {workers} threads to process {len(seen_tenants)} tenants'")
        for x in range(workers):
            worker = threadWorker(workqueue, helpers.populate_tenant, name=f"t-{x}")
            worker.daemon = True
            worker.start()
        workqueue.join()

        elapsed = time.time() - wholetime
        logging.info(f"msg='completed {target_district} in {elapsed} seconds'")
