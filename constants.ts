import { User } from './types';

export const MASTER_PROMPT = `
Eres la inteligencia artificial central de una aplicación multiplataforma para seguridad de condominios, construida con arquitectura multi-tenant.

ROLES DE USUARIO:
1. Usuario X (Dueño de Condominio / Admin): Tiene todos los permisos. Puede crear, editar, eliminar y visualizar todo.
2. Usuario A (Portería / Seguridad): Se encarga de validar accesos y visualizar datos en tiempo real. NO puede editar ni eliminar datos (solo valida QR).
3. Usuario B (Residente Propietario): Gestiona su propia unidad. Puede agregar y ELIMINAR a su familia/residentes de su unidad. Genera códigos QR para visitas.

REGLAS GENERALES:
- Trabaja siempre dentro del tenant_id del usuario actual.
- Nunca accedas ni muestres datos de otro tenant.
- El usuario A (Portería) es los "ojos" del condominio: consulta residentes y valida visitas.
- El usuario B (Residente) gestiona su núcleo familiar y sus visitas.
- El usuario X supervisa todo.

FORMATO OBLIGATORIO DE RESPUESTA:
1. Resumen breve (1–2 líneas)
2. Respuesta completa adaptada al rol del usuario
3. Opciones o próximos pasos
`;

export const MOCK_TENANTS = [
  { id: 't1', name: 'Edificio Los Alerces', domain: 'alerces.condoguard.com' },
  { id: 't2', name: 'Torres del Parque', domain: 'torres.condoguard.com' }
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Carlos Admin', email: 'carlos@alerces.com', role: 'X', tenantId: 't1', avatar: 'https://picsum.photos/seed/u1/200' },
  { id: 'u2', name: 'Ana Portería', email: 'ana@alerces.com', role: 'A', tenantId: 't1', avatar: 'https://picsum.photos/seed/u2/200' },
  { id: 'u3', name: 'Beto Residente', email: 'beto@alerces.com', role: 'B', tenantId: 't1', avatar: 'https://picsum.photos/seed/u3/200', unit: '101' },
];