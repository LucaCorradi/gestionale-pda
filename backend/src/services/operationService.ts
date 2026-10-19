import { BadRequestError } from '../errors/badRequest';
import { Department } from '../models/departmentEntity';
import { Operation } from '../models/operationEntity';
import { OperationRow } from '../models/operationRowEntity';
import { OperationType, OperationTypeName } from '../models/operationTypeEntity';
import { OperationDetailResponse } from '../schemas/operationDetailSchema';
import { PassepartoutHandler } from '../utils/passepartout/passepartoutHandler';
import { OperationConfirmRequest } from '../schemas/operationConfirmSchema';
import { dataSource } from '../../appDataSource';
import { LessThan, Not } from 'typeorm';

const operationRules: Record<OperationTypeName, (keyof OperationDetailResponse)[]> = {
	[OperationTypeName.MOVIMENTA_SCARICO]: ["Employees", "WarehousesFrom"],
	[OperationTypeName.MOVIMENTA_CARICO]: ["Employees", "WarehousesTo"],
	[OperationTypeName.SPOSTAMENTO_MAGAZZINO]: ["Employees", "WarehousesFrom", "WarehousesTo"],
	[OperationTypeName.CARICO_FORNITORE]: ["Employees", "WarehousesTo", "Suppliers", "DocumentNumber"]
};

const dataLoader: Record<(keyof OperationDetailResponse), () => any> = {
	"Employees": PassepartoutHandler.getEmployees,
	"WarehousesFrom": PassepartoutHandler.getWarehouses,
	"WarehousesTo": PassepartoutHandler.getWarehouses,
	"Suppliers": PassepartoutHandler.getSuppliers,
	"DocumentNumber": () => 1
};

export class OperationService {
	constructor(
		private departmentRepository = dataSource.getRepository(Department),
		private operationTypeRepository = dataSource.getRepository(OperationType),
		private operationRepository = dataSource.getRepository(Operation),
		private operationRowRepository = dataSource.getRepository(OperationRow),
	) { }


	public async getAllDepartments(): Promise<Department[]> {
		return await this.departmentRepository.find();
	}

	public async getOperationTypesByDepartmentID(departmentID: number): Promise<OperationType[]> {
		return await this.operationTypeRepository.find({
			where: {
				Departments: {
					ID: departmentID
				}
			}
		});
	}

	public async getOperationDetailsByOperationTypeID(operationTypeID: number): Promise<Record<string, unknown[]>> {
		const operationType = await this.operationTypeRepository.findOne({
			where: {
				ID: operationTypeID
			}
		});

		if (!operationType) {
			throw new BadRequestError("Invalid Operation Type ID");
		}

		// Estraggo le chiavi associate al tipo di operazione in input
		const outputKeys = operationRules[operationType.Name];

		const entries = await Promise.all(
			outputKeys.map(async (key) => {
				const loader = dataLoader[key]; // Estraggo il loader
				const value = await loader(); // Eseguo il loader per l'estrazione dei dati da Passepartout
				return [key, value]; // Ritorno la coppia [chiave, valore]
			})
		);

		return Object.fromEntries(entries);
	}
	
	public async confirmOperation(operationConfirmPayload: OperationConfirmRequest) {
		/*
			1) Estrazione del tipo di operazione 
		*/
		const operationType = await this.operationTypeRepository.findOneOrFail({
			where: {
				ID: operationConfirmPayload.OperationTypeID
			}
		});

		/*
			2) Estrazione del dipartimento
		*/
		const department = await this.departmentRepository.findOneOrFail({
			where: {
				ID: operationConfirmPayload.DepartmentID
			}
		});

		/*
			3) Creazione del documento
		*/
		const ppDocument = await PassepartoutHandler.putDocument(operationConfirmPayload, operationType.Name, department.Name);

		const operation = new Operation();
		operation.Date = new Date(ppDocument.Date);
		operation.Department = department;
		operation.OperationType = operationType;
		operation.PassepartoutDocumentID = ppDocument.Number;
		operation.Employee = operationConfirmPayload.EmployeeName || null;
		operation.WarehouseFrom = operationConfirmPayload.WarehouseFrom || null;
		operation.WarehouseTo = operationConfirmPayload.WarehouseTo || null;
		operation.Supplier = operationConfirmPayload.Supplier || null;

		const savedOperation = await this.operationRepository.save(operation);

		for (const ppDocumentRow of ppDocument.Products) {
			const operationRow: OperationRow = new OperationRow();
			operationRow.ProductCode = ppDocumentRow.Code;
			operationRow.FridgeUUID = ppDocumentRow.FridgeUUID ?? null;
			operationRow.Quantity = ppDocumentRow.Quantity;
			operationRow.Operation = savedOperation;
			await this.operationRowRepository.save(operationRow);
		}

		return { 
			OperationType: operationType.Name,
			Number: ppDocument.Number,
			Date: ppDocument.Date,
			EmployeeName: operationConfirmPayload.EmployeeName,
			WarehouseFrom: operationConfirmPayload.WarehouseFrom,
			WarehouseTo: operationConfirmPayload.WarehouseTo,
			Supplier: operationConfirmPayload.Supplier,
			Products: operationConfirmPayload.Products
		};
	}

	public async getLastDocumentByProductCodeAndDate(productCode: string, date: string): Promise<Operation | null> {
		return await this.operationRepository.findOne({
			where: {
				OperationRows: {
					ProductCode: productCode
				},
				Date: LessThan(new Date(date)),
				OperationType: {
					Name: Not(OperationTypeName.MOVIMENTA_SCARICO)
				}
			},
			order: {
				Date: "DESC"
			},
			relations: ["OperationRows"]
		});
    }

}
