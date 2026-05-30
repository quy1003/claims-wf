import { Entity, Column, PrimaryColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ClaimEntity } from './claim.entity';

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryColumn({ length: 64 })
  id!: string;

  @Column({ length: 64 })
  claimId!: string;

  @CreateDateColumn()
  timestamp!: Date;

  @Column({ type: 'varchar', length: 32, nullable: true })
  fromState!: string | null;

  @Column({ length: 32 })
  toState!: string;

  @Column({ length: 64 })
  triggeredByUserId!: string;

  @Column({ length: 64 })
  triggeredByRole!: string;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ type: 'json', nullable: true })
  context?: Record<string, any>;

  @ManyToOne(() => ClaimEntity, (claim) => claim.auditLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'claimId' })
  claim?: ClaimEntity;
}
