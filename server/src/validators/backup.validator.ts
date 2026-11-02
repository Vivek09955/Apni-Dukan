import { z } from 'zod';

export const restoreBackupSchema = z.object({
  confirm: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm the restore operation with confirm: true' }),
  }),
  backupData: z.record(z.any(), {
    required_error: 'Backup data payload is required',
  }),
});

export type RestoreBackupInput = z.infer<typeof restoreBackupSchema>;
