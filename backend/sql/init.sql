-- Schema del database del gestionale PDA + dati di base.
-- Da eseguire una volta su un database vuoto (Plesk -> Database -> phpMyAdmin -> Importa, oppure da riga di comando):
--   mysql -u UTENTE -p NOME_DATABASE < sql/init.sql
-- Sicuro da rieseguire: le tabelle esistenti non vengono toccate e i dati di base non si duplicano.
--
-- Dati di base: due reparti (Negozio, Cucina) e i quattro tipi di operazione, tutti abilitati su tutti i reparti.
-- Modificali pure (nomi dei reparti, quali operazioni per quale reparto) dopo l'importazione.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `departments` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `CreatedAt` timestamp(6) NOT NULL DEFAULT current_timestamp(6),
  `UpdatedAt` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `Name` varchar(255) NOT NULL,
  `Description` text DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `operation_types` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `CreatedAt` timestamp(6) NOT NULL DEFAULT current_timestamp(6),
  `UpdatedAt` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `Name` enum('Movimenta Scarico','Movimenta Carico','Spostamento Magazzino','Carico Fornitore') NOT NULL,
  `Description` text DEFAULT NULL,
  PRIMARY KEY (`ID`),
  UNIQUE KEY `IDX_70bbee2ec1c96bbbbc25c383fe` (`Name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `departments_operation_types` (
  `OperationTypeID` int(11) NOT NULL,
  `DepartmentID` int(11) NOT NULL,
  PRIMARY KEY (`OperationTypeID`,`DepartmentID`),
  KEY `IDX_c7c796625111db81eab4e5139d` (`OperationTypeID`),
  KEY `IDX_f3f30d5557e15023bb6d5fd153` (`DepartmentID`),
  CONSTRAINT `FK_c7c796625111db81eab4e5139da` FOREIGN KEY (`OperationTypeID`) REFERENCES `operation_types` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_f3f30d5557e15023bb6d5fd153e` FOREIGN KEY (`DepartmentID`) REFERENCES `departments` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `operations` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `CreatedAt` timestamp(6) NOT NULL DEFAULT current_timestamp(6),
  `Date` date NOT NULL,
  `PassepartoutDocumentID` int(11) NOT NULL,
  `Employee` varchar(256) DEFAULT NULL,
  `WarehouseTo` varchar(256) DEFAULT NULL,
  `WarehouseFrom` varchar(256) DEFAULT NULL,
  `Supplier` varchar(256) DEFAULT NULL,
  `DepartmentID` int(11) DEFAULT NULL,
  `OperationTypeID` int(11) DEFAULT NULL,
  PRIMARY KEY (`ID`),
  KEY `FK_07d00e6aafc187706c1ecb4936b` (`DepartmentID`),
  KEY `FK_82f7eadb6bcf31882ce4662361b` (`OperationTypeID`),
  CONSTRAINT `FK_07d00e6aafc187706c1ecb4936b` FOREIGN KEY (`DepartmentID`) REFERENCES `departments` (`ID`) ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT `FK_82f7eadb6bcf31882ce4662361b` FOREIGN KEY (`OperationTypeID`) REFERENCES `operation_types` (`ID`) ON DELETE SET NULL ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `operation_rows` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `CreatedAt` timestamp(6) NOT NULL DEFAULT current_timestamp(6),
  `ProductCode` varchar(64) NOT NULL,
  `Quantity` decimal(12,3) NOT NULL,
  `FridgeUUID` char(36) DEFAULT NULL,
  `OperationID` int(11) NOT NULL,
  PRIMARY KEY (`ID`),
  KEY `FK_6c52378db0e55d0e22a1effd899` (`OperationID`),
  CONSTRAINT `FK_6c52378db0e55d0e22a1effd899` FOREIGN KEY (`OperationID`) REFERENCES `operations` (`ID`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dati di base
INSERT IGNORE INTO departments (ID, Name, Description) VALUES (1, 'Negozio', 'Reparto negozio');
INSERT IGNORE INTO departments (ID, Name, Description) VALUES (2, 'Cucina', 'Reparto cucina');
INSERT IGNORE INTO operation_types (ID, Name, Description) VALUES (1, 'Movimenta Scarico', 'Movimenta Scarico');
INSERT IGNORE INTO operation_types (ID, Name, Description) VALUES (2, 'Movimenta Carico', 'Movimenta Carico');
INSERT IGNORE INTO operation_types (ID, Name, Description) VALUES (3, 'Spostamento Magazzino', 'Spostamento Magazzino');
INSERT IGNORE INTO operation_types (ID, Name, Description) VALUES (4, 'Carico Fornitore', 'Carico Fornitore');
INSERT IGNORE INTO departments_operation_types (OperationTypeID, DepartmentID) VALUES (1, 1);
INSERT IGNORE INTO departments_operation_types (OperationTypeID, DepartmentID) VALUES (1, 2);
INSERT IGNORE INTO departments_operation_types (OperationTypeID, DepartmentID) VALUES (2, 1);
INSERT IGNORE INTO departments_operation_types (OperationTypeID, DepartmentID) VALUES (2, 2);
INSERT IGNORE INTO departments_operation_types (OperationTypeID, DepartmentID) VALUES (3, 1);
INSERT IGNORE INTO departments_operation_types (OperationTypeID, DepartmentID) VALUES (3, 2);
INSERT IGNORE INTO departments_operation_types (OperationTypeID, DepartmentID) VALUES (4, 1);
INSERT IGNORE INTO departments_operation_types (OperationTypeID, DepartmentID) VALUES (4, 2);
