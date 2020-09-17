#!/bin/bash
mysql -u root -ppassword -e "DROP DATABASE IF EXISTS uniroster; DROP DATABASE IF EXISTS sample_or10; CREATE DATABASE uniroster; CREATE DATABASE sample_or10"
mysql -u root -ppassword uniroster < /uniroster-server/sql/uniroster.sql
mysql -u root -ppassword sample_or10 < /uniroster-server/sql/sample_or10.sql