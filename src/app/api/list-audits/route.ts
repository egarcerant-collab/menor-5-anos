
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface AuditFile {
    month: string;
    prestador: string;
    path: string;
}

export async function GET() {
  try {
    const rootDir = process.cwd();
    const reportsDir = path.join(rootDir, 'public', 'informes');
    
    try {
      await fs.access(reportsDir);
    } catch (e) {
      // If the directory doesn't exist, return an empty array.
      return NextResponse.json([]);
    }

    const monthDirs = await fs.readdir(reportsDir, { withFileTypes: true });

    const allAudits: AuditFile[] = [];

    for (const monthDir of monthDirs) {
        if (monthDir.isDirectory()) {
            const monthPath = path.join(reportsDir, monthDir.name);
            try {
                const files = await fs.readdir(monthPath);
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        const prestadorName = file.replace('.json', '');
                        allAudits.push({
                            month: monthDir.name,
                            prestador: prestadorName,
                            path: `/informes/${monthDir.name}/${file}`,
                        });
                    }
                }
            } catch (err) {
                console.warn(`Could not read directory ${monthPath}:`, err);
            }
        }
    }

    return NextResponse.json(allAudits);

  } catch (error: any) {
    console.error('Error al listar los archivos de auditoría:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ message: 'Error al listar archivos.', error: errorMessage }, { status: 500 });
  }
}
