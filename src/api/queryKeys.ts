export const queryKeys = {
  health: ['health'] as const,
  materials: ['materials'] as const,
  job: (id: string) => ['job', id] as const,
  design: (id: string) => ['design', id] as const,
}
