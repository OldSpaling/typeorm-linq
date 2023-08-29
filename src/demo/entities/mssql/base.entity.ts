import { Column, PrimaryGeneratedColumn } from 'typeorm';

export class BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;
  @Column('nvarchar', { name: 'created_user_id', length: 255 })
  createdUserId = '';
  @Column('datetime', { name: 'created_date' })
  createdTime = new Date();
  @Column('nvarchar', { name: 'updated_user_id', length: 255 })
  updatedUserId = '';
  @Column('datetime', { name: 'updated_date' })
  updatedTime = new Date();
  @Column('bit', { name: 'is_deleted', default: 0 })
  isDeleted: boolean = false;
}
