
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { KeyRound, Save, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';

interface ApiKeyManagerProps {
  initialApiKey: string;
  onApiKeyChange: (key: string) => void;
}

export default function ApiKeyManager({ initialApiKey, onApiKeyChange }: ApiKeyManagerProps) {
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [isKeyMissing, setIsKeyMissing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setApiKey(initialApiKey);
    setIsKeyMissing(!initialApiKey);
  }, [initialApiKey]);

  const handleSaveKey = () => {
    if (!apiKey) {
      toast({
        title: 'Clave no válida',
        description: 'Por favor, introduce una clave de API de Gemini válida.',
        variant: 'destructive',
      });
      return;
    }
    localStorage.setItem('gemini_api_key', apiKey);
    onApiKeyChange(apiKey);
    setIsKeyMissing(false);
    toast({
      title: 'Clave de API Guardada',
      description: 'Tu clave de API de Gemini ha sido guardada en el navegador.',
    });
    // Forzar un refresco de la página para que la nueva configuración de Genkit se aplique en todas partes
    window.location.reload();
  };

  return (
    <Card className="w-full shadow-md bg-amber-50 border-amber-200">
      <CardHeader>
        <div className="flex items-center gap-3">
            <KeyRound className="h-6 w-6 text-amber-600" />
            <div>
                <CardTitle>Configurar Clave de API de Gemini</CardTitle>
                <CardDescription>
                    Para usar las funciones de IA, necesitas una clave de API de Google Gemini.
                </CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {isKeyMissing && (
            <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>¡Acción Requerida!</AlertTitle>
                <AlertDescription>
                    Las funciones de IA están deshabilitadas. Por favor, introduce tu clave de API de Gemini para activarlas.
                    Puedes obtener una clave en <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="font-semibold underline">Google AI Studio</a>.
                </AlertDescription>
            </Alert>
        )}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Input
            type="password"
            placeholder="Pega tu clave de API de Gemini aquí..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="flex-grow"
          />
          <Button onClick={handleSaveKey}>
            <Save className="mr-2 h-4 w-4" />
            Guardar Clave
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
