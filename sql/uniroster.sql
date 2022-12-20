BEGIN;

SELECT DATABASE();

DROP TABLE IF EXISTS `clients`;

CREATE TABLE `clients` (
                           `description` char(128) NOT NULL,
                           `dataset` char(64) NOT NULL,
                           `client_id` char(64) PRIMARY KEY,
                           `client_secret` char(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Data for the table `account` */

INSERT  INTO `clients`(`description`,`dataset`,`client_id`,`client_secret`) VALUES

/*
>>> hashlib.sha256(b'96de9379-839d-48f4-8fc9-ac126912703d').hexdigest()
'63d4e1b517d80ed31c8074cb4e1c70ea75467071c3f87f378aea5cd2489ccb25'
*/

    ('Sample data (OneRoster v1.0)','sample_or10','6efab379-f783-4c77-9296-6c37e656c7b2','63d4e1b517d80ed31c8074cb4e1c70ea75467071c3f87f378aea5cd2489ccb25');

CREATE TABLE `tokens`(
                         `access_token` char(64) PRIMARY KEY,
                         `access_token_expires_at` varchar(255) NOT NULL,
                         `client_id` char(64) NOT NULL
);

COMMIT;