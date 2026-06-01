import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserRole } from '../constants';

@Entity('users')
export class UserEntity {
  @PrimaryColumn({ length: 64 })
  id!: string;

  @Column({ unique: true, length: 128 })
  username!: string;

  @Column({ length: 255 })
  password!: string;

  @Column({
    type: 'varchar',
    length: 64,
    default: UserRole.DOCUMENT_CLERK,
  })
  role!: UserRole;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
