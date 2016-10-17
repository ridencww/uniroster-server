/*
SQLyog Ultimate v12.2.6 (64 bit)
MySQL - 5.5.44 : Database - sample_or10
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
/*Table structure for table `academicsessions` */

DROP TABLE IF EXISTS `academicsessions`;

CREATE TABLE `academicsessions` (
  `sourcedId` varchar(255) NOT NULL,
  `status` varchar(255) DEFAULT NULL,
  `dateLastModified` varchar(255) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `startDate` varchar(255) DEFAULT NULL,
  `endDate` varchar(255) DEFAULT NULL,
  `parentSourcedId` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`sourcedId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Data for the table `academicsessions` */

insert  into `academicsessions`(`sourcedId`,`status`,`dateLastModified`,`title`,`type`,`startDate`,`endDate`,`parentSourcedId`) values 
('297eaf13-a1d1-5c57-bab5-77c68c06c49e','active','2016-09-24','Fall 2016-17','semester','2016-08-15','2016-12-16','2ce9ee11-fa80-50d4-bf37-931681ca6246'),
('2ce9ee11-fa80-50d4-bf37-931681ca6246','active','2016-09-24','2016-17','schoolYear','2016-08-15','2017-06-02',NULL),
('32ee77b5-7dee-5a94-adb9-98f05aebdce6','active','2016-09-24','Spring 2016-17','semester','2017-01-02','2017-06-02','2ce9ee11-fa80-50d4-bf37-931681ca6246');

/*Table structure for table `classes` */

DROP TABLE IF EXISTS `classes`;

CREATE TABLE `classes` (
  `sourcedId` varchar(255) NOT NULL,
  `status` varchar(255) DEFAULT NULL,
  `dateLastModified` varchar(255) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `grade` varchar(255) DEFAULT NULL,
  `courseSourcedId` varchar(255) DEFAULT NULL,
  `classCode` varchar(255) DEFAULT NULL,
  `classType` varchar(255) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `schoolSourcedId` varchar(255) DEFAULT NULL,
  `termSourcedId` varchar(255) DEFAULT NULL,
  `subjects` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`sourcedId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Data for the table `classes` */

/*Table structure for table `courses` */

DROP TABLE IF EXISTS `courses`;

CREATE TABLE `courses` (
  `sourcedId` varchar(255) NOT NULL,
  `status` varchar(255) DEFAULT NULL,
  `dateLastModified` varchar(255) DEFAULT NULL,
  `schoolYearId` varchar(255) DEFAULT NULL,
  `metadata#duration` varchar(255) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `courseCode` varchar(255) DEFAULT NULL,
  `grade` varchar(255) DEFAULT NULL,
  `orgSourcedId` varchar(255) DEFAULT NULL,
  `subjects` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`sourcedId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Data for the table `courses` */

/*Table structure for table `demographics` */

DROP TABLE IF EXISTS `demographics`;

CREATE TABLE `demographics` (
  `userSourcedId` varchar(255) NOT NULL,
  `status` varchar(255) DEFAULT NULL,
  `dateLastModified` varchar(255) DEFAULT NULL,
  `birthdate` varchar(255) DEFAULT NULL,
  `sex` varchar(255) DEFAULT NULL,
  `americanIndianOrAlaskaNative` varchar(255) DEFAULT NULL,
  `asian` varchar(255) DEFAULT NULL,
  `blackOrAfricanAmerican` varchar(255) DEFAULT NULL,
  `nativeHawaiianOrOtherPacificIslander` varchar(255) DEFAULT NULL,
  `white` varchar(255) DEFAULT NULL,
  `demographicRaceTwoOrMoreRaces` varchar(255) DEFAULT NULL,
  `hispanicOrLatinoEthnicity` varchar(255) DEFAULT NULL,
  `countryOfBirthCode` varchar(255) DEFAULT NULL,
  `stateOfBirthAbbreviation` varchar(255) DEFAULT NULL,
  `cityOfBirth` varchar(255) DEFAULT NULL,
  `publicSchoolResidenceStatus` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`userSourcedId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Data for the table `demographics` */

insert  into `demographics`(`userSourcedId`,`status`,`dateLastModified`,`birthdate`,`sex`,`americanIndianOrAlaskaNative`,`asian`,`blackOrAfricanAmerican`,`nativeHawaiianOrOtherPacificIslander`,`white`,`demographicRaceTwoOrMoreRaces`,`hispanicOrLatinoEthnicity`,`countryOfBirthCode`,`stateOfBirthAbbreviation`,`cityOfBirth`,`publicSchoolResidenceStatus`) values 
('284ddc63-0a51-55ae-8d38-947d29e329d7','active','2016-09-24','2003-08-28','female',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
('3810f534-eb32-5b03-9ad2-0b5b24817fbb','active','2016-09-24','2003-06-18','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
('5577ef32-bdb8-5483-8db5-bd5753ec8112','active','2016-09-24','2003-08-24','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
('5b04d264-e8de-5f2f-bdcf-e97eea522230','active','2016-09-24','1996-10-21','female',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
('b6aa450c-166a-59a2-8d98-a640d505c768','active','2016-09-24','2001-01-12','female',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);

/*Table structure for table `enrollments` */

DROP TABLE IF EXISTS `enrollments`;

CREATE TABLE `enrollments` (
  `sourcedId` varchar(255) NOT NULL,
  `classSourcedId` varchar(255) DEFAULT NULL,
  `schoolSourcedId` varchar(255) DEFAULT NULL,
  `userSourcedId` varchar(255) DEFAULT NULL,
  `role` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `dateLastModified` varchar(255) DEFAULT NULL,
  `primary` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`sourcedId`),
  KEY `classSourcedId_idx` (`classSourcedId`),
  KEY `schoolSourcedId_idx` (`schoolSourcedId`),
  KEY `userSourcedId_idx` (`userSourcedId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Data for the table `enrollments` */

/*Table structure for table `orgs` */

DROP TABLE IF EXISTS `orgs`;

CREATE TABLE `orgs` (
  `sourcedId` varchar(255) NOT NULL,
  `status` varchar(255) DEFAULT NULL,
  `dateLastModified` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `identifier` varchar(255) DEFAULT NULL,
  `metadata#classification` varchar(255) DEFAULT NULL,
  `metadata#gender` varchar(255) DEFAULT NULL,
  `metadata#boarding` varchar(255) DEFAULT NULL,
  `parentSourcedId` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`sourcedId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Data for the table `orgs` */

insert  into `orgs`(`sourcedId`,`status`,`dateLastModified`,`name`,`type`,`identifier`,`metadata#classification`,`metadata#gender`,`metadata#boarding`,`parentSourcedId`) values 
('0c41c42d-6f27-5c90-bddf-5d46814bd992','active','2016-09-24','Ada Lovelace Academy','school','999001','public','mixed','False','a94a75ef-a93a-5df1-a061-98e3fb304ba9'),
('42245f0e-fed9-5ca8-a0dd-8b2e3ca4bd09','active','2016-09-24','Grace Hopper High School','school','999002','public','mixed','False','a94a75ef-a93a-5df1-a061-98e3fb304ba9'),
('6546686a-9242-500a-8e78-fcbc165850e1','active','2016-09-24','Marie Curie JHS','school','999003','public','mixed','False','a94a75ef-a93a-5df1-a061-98e3fb304ba9'),
('a94a75ef-a93a-5df1-a061-98e3fb304ba9','active','2016-09-24','Techtown ISD','local','999000','public','mixed','False',NULL);

/*Table structure for table `users` */

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `sourcedId` varchar(255) NOT NULL,
  `status` varchar(255) DEFAULT NULL,
  `dateLastModified` varchar(255) DEFAULT NULL,
  `orgSourcedIds` varchar(255) DEFAULT NULL,
  `role` varchar(255) DEFAULT NULL,
  `username` varchar(255) DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `givenName` varchar(255) DEFAULT NULL,
  `familyName` varchar(255) DEFAULT NULL,
  `identifier` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `sms` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `agents` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`sourcedId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Data for the table `users` */

insert  into `users`(`sourcedId`,`status`,`dateLastModified`,`orgSourcedIds`,`role`,`username`,`userId`,`givenName`,`familyName`,`identifier`,`email`,`sms`,`phone`,`agents`) values 
('284ddc63-0a51-55ae-8d38-947d29e329d7','active','2016-09-24','0c41c42d-6f27-5c90-bddf-5d46814bd992','student','SP37606','SP37606','Sadie','Palmer','3219892','SP37606@techtownisd.org',NULL,NULL,NULL),
('3810f534-eb32-5b03-9ad2-0b5b24817fbb','active','2016-09-24','0c41c42d-6f27-5c90-bddf-5d46814bd992','student','DW20794','DW20794','Darrell','Wong','8182398','DW20794@techtownisd.org',NULL,NULL,NULL),
('53e9c039-fc0d-58b1-8c68-b22144bb1183','active','2016-09-24','0c41c42d-6f27-5c90-bddf-5d46814bd992,42245f0e-fed9-5ca8-a0dd-8b2e3ca4bd09','teacher','MM16891','MM16891','Marion','McDonald','7897917','MM16891@techtownisd.org',NULL,NULL,NULL),
('5577ef32-bdb8-5483-8db5-bd5753ec8112','active','2016-09-24','0c41c42d-6f27-5c90-bddf-5d46814bd992','student','BC31107','BC31107','Barry','Carter','2170656','BC31107@techtownisd.org',NULL,NULL,NULL),
('5b04d264-e8de-5f2f-bdcf-e97eea522230','active','2016-09-24','0c41c42d-6f27-5c90-bddf-5d46814bd992','student','LV81603','LV81603','Loretta','Vasquez','3885090','LV81603@techtownisd.org',NULL,NULL,NULL),
('b6aa450c-166a-59a2-8d98-a640d505c768','active','2016-09-24','0c41c42d-6f27-5c90-bddf-5d46814bd992','student','ES85359','ES85359','Eugenia','Schultz','4361527','ES85359@techtownisd.org',NULL,NULL,NULL);

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
