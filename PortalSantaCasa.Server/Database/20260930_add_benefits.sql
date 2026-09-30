-- Execute no banco do portal antes de disponibilizar a funcionalidade.
CREATE TABLE IF NOT EXISTS `benefits` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `Title` varchar(160) NOT NULL,
  `Description` varchar(4000) NOT NULL,
  `Category` varchar(100) NOT NULL,
  `Eligibility` varchar(500) NOT NULL,
  `HowToAccess` varchar(2000) NOT NULL,
  `Link` varchar(1000) NULL,
  `IsActive` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`Id`)
) CHARACTER SET utf8mb4;
