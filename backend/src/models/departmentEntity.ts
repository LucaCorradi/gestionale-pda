import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Operation } from "./operationEntity";

@Entity("departments")
export class Department {
    @PrimaryGeneratedColumn()
    ID: number;

    @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)" })
    CreatedAt: Date;

    @UpdateDateColumn({ type: "timestamp", nullable: true, onUpdate: "CURRENT_TIMESTAMP(6)" })
    UpdatedAt: Date;

    @Column( { type: "varchar", length: 255 })
    Name: string;

    @Column( { type: "text", nullable: true, default: null })
    Description: string;

    @OneToMany(() => Operation, operation => operation.Department)
    Operations: Operation[];
}