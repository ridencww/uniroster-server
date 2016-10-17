/*
SQLyog Ultimate v12.2.6 (64 bit)
MySQL - 5.5.44 : Database - uniroster
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
/*Table structure for table `account` */

DROP TABLE IF EXISTS `account`;

CREATE TABLE `account` (
  `description` char(128) NOT NULL,
  `dataset` char(64) NOT NULL,
  `client_id` char(64) NOT NULL,
  `client_password` char(64) NOT NULL,
  PRIMARY KEY (`client_id`),
  KEY `client_id_idx` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Data for the table `account` */

insert  into `account`(`description`,`dataset`,`client_id`,`client_password`) values 
('Sample data (OneRoster v1.0)','sample_or10','6efab379-f783-4c77-9296-6c37e656c7b2','96de9379-839d-48f4-8fc9-ac126912703d');

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
