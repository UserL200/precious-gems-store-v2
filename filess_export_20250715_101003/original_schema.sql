/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `Commissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Commissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `amount` float DEFAULT NULL,
  `referredPurchaseId` int NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `UserId` int DEFAULT NULL,
  `referrerId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `referredPurchaseId` (`referredPurchaseId`),
  KEY `UserId` (`UserId`),
  CONSTRAINT `Commissions_ibfk_18` FOREIGN KEY (`referredPurchaseId`) REFERENCES `Purchases` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `Commissions_ibfk_19` FOREIGN KEY (`UserId`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `Products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `price` float NOT NULL,
  `description` text,
  `imageUrl` text,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `Purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Purchases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `active` tinyint(1) DEFAULT '1',
  `totalAmount` float NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `UserId` int DEFAULT NULL,
  `productId` int DEFAULT NULL,
  `status` enum('pending','approved','declined') NOT NULL DEFAULT 'pending',
  PRIMARY KEY (`id`),
  KEY `UserId` (`UserId`),
  KEY `productId` (`productId`),
  CONSTRAINT `Purchases_ibfk_15` FOREIGN KEY (`UserId`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Purchases_ibfk_16` FOREIGN KEY (`productId`) REFERENCES `Products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `SequelizeMeta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SequelizeMeta` (
  `name` varchar(255) COLLATE utf8mb3_unicode_ci NOT NULL,
  PRIMARY KEY (`name`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `Sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Sessions` (
  `sid` varchar(36) NOT NULL,
  `expires` datetime DEFAULT NULL,
  `data` text,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`sid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `Users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `phone` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `referralCode` varchar(255) DEFAULT NULL,
  `referredBy` int DEFAULT NULL,
  `isAdmin` tinyint(1) DEFAULT '0',
  `isActive` tinyint(1) DEFAULT '1',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `phone` (`phone`),
  UNIQUE KEY `phone_2` (`phone`),
  UNIQUE KEY `phone_3` (`phone`),
  UNIQUE KEY `phone_4` (`phone`),
  UNIQUE KEY `phone_5` (`phone`),
  UNIQUE KEY `phone_6` (`phone`),
  UNIQUE KEY `phone_7` (`phone`),
  UNIQUE KEY `phone_8` (`phone`),
  UNIQUE KEY `phone_9` (`phone`),
  UNIQUE KEY `phone_10` (`phone`),
  UNIQUE KEY `phone_11` (`phone`),
  UNIQUE KEY `phone_12` (`phone`),
  UNIQUE KEY `phone_13` (`phone`),
  UNIQUE KEY `referralCode` (`referralCode`),
  UNIQUE KEY `referralCode_2` (`referralCode`),
  UNIQUE KEY `referralCode_3` (`referralCode`),
  UNIQUE KEY `referralCode_4` (`referralCode`),
  UNIQUE KEY `referralCode_5` (`referralCode`),
  UNIQUE KEY `referralCode_6` (`referralCode`),
  UNIQUE KEY `referralCode_7` (`referralCode`),
  UNIQUE KEY `referralCode_8` (`referralCode`),
  UNIQUE KEY `referralCode_9` (`referralCode`),
  UNIQUE KEY `referralCode_10` (`referralCode`),
  UNIQUE KEY `referralCode_11` (`referralCode`),
  UNIQUE KEY `referralCode_12` (`referralCode`),
  UNIQUE KEY `referralCode_13` (`referralCode`),
  KEY `referredBy` (`referredBy`),
  CONSTRAINT `Users_ibfk_1` FOREIGN KEY (`referredBy`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `Withdrawals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Withdrawals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `amount` float NOT NULL,
  `bankName` varchar(255) NOT NULL,
  `accountNumber` varchar(255) NOT NULL,
  `status` enum('pending','approved','declined') DEFAULT 'pending',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `UserId` int DEFAULT NULL,
  `forfeitPurchaseId` int DEFAULT NULL,
  `forfeitedAmount` decimal(10,2) DEFAULT '0.00',
  `adminNote` text,
  `processedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `Withdrawals_forfeitPurchaseId_foreign_idx` (`forfeitPurchaseId`),
  KEY `withdrawals_user_id_status` (`UserId`,`status`),
  KEY `withdrawals_status_created_at` (`status`,`createdAt`),
  CONSTRAINT `Withdrawals_forfeitPurchaseId_foreign_idx` FOREIGN KEY (`forfeitPurchaseId`) REFERENCES `Purchases` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Withdrawals_ibfk_1` FOREIGN KEY (`UserId`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

