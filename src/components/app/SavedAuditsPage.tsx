
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import AuditSearch from "../saved-audits/AuditSearch";
import { SavedAuditData } from "./JsonAnalyzerPage";

interface SavedAuditsPageProps {
  onAuditLoad: (auditData: SavedAuditData, prestadorName: string, month: string) => void;
}

export default function SavedAuditsPage({ onAuditLoad }: SavedAuditsPageProps) {
  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="text-center">
        <CardTitle>Continuar una Auditoría Guardada</CardTitle>
        <CardDescription>
          Selecciona una auditoría previamente guardada para cargar tu progreso.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AuditSearch onAuditLoad={onAuditLoad} />
      </CardContent>
    </Card>
  );
}
