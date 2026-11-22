import type { CollectionSchema } from 'deepspace/schema'
import { usersSchema } from './schemas/users-schema'
import { settingsSchema } from './schemas/admin-schema'
import { profilesSchema, applicationsSchema } from './schemas/student-schema'
export const schemas: CollectionSchema[] = [usersSchema, settingsSchema, profilesSchema, applicationsSchema]
