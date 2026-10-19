import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Operation } from "./operationEntity";

@Entity("operation_rows")
export class OperationRow {
    @PrimaryGeneratedColumn()
    ID: number;

    @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)" })
    CreatedAt: Date;

    @Column({ type: "varchar", length: 64 })
    ProductCode: string;

    @Column({ type: "decimal", precision: 12, scale: 3 })
    Quantity: number;

    @Column({ type: "char", length: 36, nullable: true })
    FridgeUUID: string | null;

    @ManyToOne(type => Operation, operation => operation.OperationRows, { onDelete: "CASCADE", nullable: false })
    @JoinColumn({ name: "OperationID" })
    Operation: Operation;
}
