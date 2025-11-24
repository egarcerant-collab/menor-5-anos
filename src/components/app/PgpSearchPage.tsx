
"use client";

import { forwardRef, useImperativeHandle } from 'react';
import PgPsearchForm from '@/components/pgp-search/PgPsearchForm';
import { ExecutionDataByMonth } from '@/app/page';
import { SavedAuditData } from './JsonAnalyzerPage';


interface PgpSearchPageProps {
  executionDataByMonth: ExecutionDataByMonth;
  jsonPrestadorCode: string | null;
  uniqueUserCount: number;
  initialAuditData: SavedAuditData | null;
}

interface PgpSearchPageHandle {
  handleSelectPrestador: (prestador: any) => void;
}

const PgpSearchPage = forwardRef<PgpSearchPageHandle, PgpSearchPageProps>(
  ({ executionDataByMonth, jsonPrestadorCode, uniqueUserCount, initialAuditData }, ref) => {
    
    // This is a dummy implementation for the ref. 
    // The actual logic is inside PgPsearchForm.
    // This could be improved by lifting state up.
    useImperativeHandle(ref, () => ({
      handleSelectPrestador: (prestador: any) => {
        // This is a bit of a workaround. Ideally the state would be managed higher up.
        // We're just logging it here to show the function is callable.
        console.log("Prestador selection triggered from parent:", prestador.PRESTADOR);
      },
    }));

    return (
      <div className="w-full space-y-8 mt-4">
        <PgPsearchForm 
          executionDataByMonth={executionDataByMonth}
          jsonPrestadorCode={jsonPrestadorCode} 
          uniqueUserCount={uniqueUserCount}
          initialAuditData={initialAuditData}
        />
      </div>
    );
  }
);

PgpSearchPage.displayName = 'PgpSearchPage';

export default PgpSearchPage;
