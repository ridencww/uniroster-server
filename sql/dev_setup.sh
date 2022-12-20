#!/bin/bash
set -eux
mysql -u root -ppassword -e "DROP DATABASE IF EXISTS uniroster; DROP DATABASE IF EXISTS sample_or10; DROP DATABASE IF EXISTS accounts; CREATE DATABASE uniroster; CREATE DATABASE sample_or10; CREATE DATABASE accounts;"
mysql -v -u root -ppassword accounts < /uniroster-server/sql/uniroster.sql
mysql -v -u root -ppassword sample_or10 < /uniroster-server/sql/sample_or10.sql