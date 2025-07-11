export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'global_admin' | 'regional_admin' | 'sending_partner' | 'receiving_partner';
  region?: string;
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Mock users for demo
export const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@jaudi.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    name: 'Global Administrator',
    role: 'global_admin',
    permissions: ['read', 'write', 'delete', 'admin'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    email: 'regional@jaudi.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    name: 'Regional Admin - West Africa',
    role: 'regional_admin',
    region: 'west_africa',
    permissions: ['read', 'write'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    email: 'sender@jaudi.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    name: 'Sending Partner - MoneyGram',
    role: 'sending_partner',
    permissions: ['read', 'write'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '4',
    email: 'receiver@jaudi.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    name: 'Receiving Partner - Local Bank',
    role: 'receiving_partner',
    region: 'west_africa',
    permissions: ['read'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];