import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Department } from "./departmentEntity";
import { Operation } from "./operationEntity";

export enum OperationTypeName {
    MOVIMENTA_SCARICO       = "Movimenta Scarico",
    MOVIMENTA_CARICO        = "Movimenta Carico",
    SPOSTAMENTO_MAGAZZINO   = "Spostamento Magazzino",
    CARICO_FORNITORE        = "Carico Fornitore",
}

@Entity("operation_types")
export class OperationType {
    @PrimaryGeneratedColumn()
    ID: number;

    @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)" })
    CreatedAt: Date;

    @UpdateDateColumn({ type: "timestamp", nullable: true, onUpdate: "CURRENT_TIMESTAMP(6)" })
    UpdatedAt: Date;

    @Column( { type: "enum", enum: OperationTypeName, unique: true })
    Name: OperationTypeName;

    @Column( { type: "text", nullable: true, default: null })
    Description: string;

    @ManyToMany(() => Department)
    @JoinTable({
        name: "departments_operation_types",
        joinColumn: {
            name: "OperationTypeID",
            referencedColumnName: "ID"
        },
        inverseJoinColumn: {
            name: "DepartmentID",
            referencedColumnName: "ID"
        }
    })
    Departments: Department[];


    @OneToMany(() => Operation, operation => operation.OperationType)
    Operations: Operation[];

}