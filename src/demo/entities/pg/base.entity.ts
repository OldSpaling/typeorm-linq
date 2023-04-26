import { Column, PrimaryGeneratedColumn } from 'typeorm';

export class BaseEntity {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;
  @Column('character varying', { name: 'created_user_id', length: 255 })
  createdUserId = '';
  @Column('timestamp without time zone', { name: 'created_date' })
  createdTime = new Date();
  @Column('character varying', { name: 'updated_user_id', length: 255 })
  updatedUserId = '';
  @Column('timestamp without time zone', { name: 'updated_date' })
  updatedTime = new Date();
  @Column('boolean', { name: 'is_deleted', default: () => 'false' })
  isDeleted: boolean = false;
}
