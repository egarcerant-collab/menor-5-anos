
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Helper function to sanitize filenames
const sanitizeFilename = (name: string) => {
    if (!name) return 'desconocido';
    return name.replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { auditData, prestadorName, month } = body;

    if (!auditData || !prestadorName || !month) {
      return NextResponse.json({ message: 'Faltan datos requeridos (auditData, prestadorName, month).' }, { status: 400 });
    }

    // Sanitize inputs to create safe directory and file names
    const sanitizedMonth = sanitizeFilename(month);
    const sanitizedPrestadorName = sanitizeFilename(prestadorName);
    
    // Define the path: public/informes/<mes>/<prestador>.json
    // Using path.resolve with process.cwd() for more reliable pathing
    const rootDir = process.cwd();
    const publicDir = path.join(rootDir, 'public');
    const reportsDir = path.join(publicDir, 'informes');
    const monthDir = path.join(reportsDir, sanitizedMonth);
    const filePath = path.join(monthDir, `${sanitizedPrestadorName}.json`);

    // Ensure the nested directory structure exists
    // We try to create them step by step or use recursive
    try {
        await fs.mkdir(monthDir, { recursive: true });
    } catch (dirError: any) {
        console.error('Error creating directory:', dirError);
        return NextResponse.json({ 
            message: `No se pudieron crear los directorios de almacenamiento: ${dirError.message}`,
            error: dirError.code 
        }, { status: 500 });
    }

    // Write the audit data to the file, overwriting if it exists
    try {
        await fs.writeFile(filePath, JSON.stringify(auditData, null, 2), 'utf-8');
    } catch (writeError: any) {
        console.error('Error writing file:', writeError);
        return NextResponse.json({ 
            message: `Error al escribir el archivo en el disco: ${writeError.message}`,
            error: writeError.code 
        }, { status: 500 });
    }

    return NextResponse.json({ message: `Auditoría para ${prestadorName} en ${month} guardada exitosamente.` }, { status: 200 });

  } catch (error: any) {
    console.error('Error crítico en API save-audit:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ 
        message: `Error interno del servidor: ${errorMessage}`,
        error: error.code || 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
