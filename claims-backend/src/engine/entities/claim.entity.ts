import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { AuditLogEntity } from './audit-log.entity';

@Entity('claims')
export class ClaimEntity {
  @PrimaryColumn({ length: 64 })
  claimId!: string;

  @Column({ length: 32 })
  currentState!: string;

  @Column({ default: 0 })
  cycleCount!: number;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => AuditLogEntity, (log) => log.claim)
  auditLogs?: AuditLogEntity[];
}
