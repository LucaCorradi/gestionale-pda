import { Employee, Warehouse } from './../schemas/operationDetailSchema';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Department } from "./departmentEntity";
import { OperationType } from "./operationTypeEntity";
import { OperationRow } from "./operationRowEntity";

@Entity("operations")
export class Operation {
    @PrimaryGeneratedColumn()
    ID: number;

    @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)" })
    CreatedAt: Date;

    @Column({ type: "date" })
    Date: Date;

    @Column({ type: "int" })
    PassepartoutDocumentID: number;

    @ManyToOne(type => Department, department => department.Operations, { onDelete: "SET NULL", nullable: true })
    @JoinColumn({ name: "DepartmentID" })
    Department: Department;

    @Column({ type: "varchar", length: 256, nullable: true, default: null })
    Employee: string | null;

    @Column({ type: "varchar", length: 256, nullable: true, default: null })
    WarehouseTo: string | null;

    @Column({ type: "varchar", length: 256, nullable: true, default: null })
    WarehouseFrom: string | null;

    @Column({ type: "varchar", length: 256, nullable: true, default: null })
    Supplier: string | null;

    @ManyToOne(type => OperationType, operationType => operationType.Operations, { onDelete: "SET NULL", nullable: true })
    @JoinColumn({ name: "OperationTypeID" })
    OperationType: OperationType;

    @OneToMany(type => OperationRow, operationRow => operationRow.Operation)
    OperationRows: OperationRow[];
}