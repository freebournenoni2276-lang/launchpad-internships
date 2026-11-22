import type { CollectionSchema } from 'deepspace/schema'

const owner = { name:'userId', storage:'text', interpretation:'plain', userBound:true, immutable:true } as const
const privateRecords = {
  viewer: { read:false, create:false, update:false, delete:false },
  member: { read:'own', create:true, update:'own', delete:'own' },
  admin: { read:'own', create:true, update:'own', delete:'own' },
} as const
const text = (name:string,maxLength:number) => ({name,storage:'text' as const,interpretation:'plain' as const,required:true,maxLength})
export const profilesSchema: CollectionSchema = {
  name:'student_profiles', ownerField:'userId', uniqueOn:['userId'], permissions:privateRecords,
  columns:[owner,text('year',60),text('location',100),text('sponsorship',30),text('skills',1200)],
}
export const applicationsSchema: CollectionSchema = {
  name:'student_applications', ownerField:'userId', uniqueOn:['userId','jobKey'], permissions:privateRecords,
  columns:[owner,{...text('jobKey',700),immutable:true},text('listing',11000),text('status',30),{...text('legacyNote',2200),required:false}],
}
