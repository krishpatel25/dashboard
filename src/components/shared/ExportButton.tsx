import { Button } from '../ui/button';
import { Download } from 'lucide-react';
import { exportToCSV } from '../../lib/csv-export';

interface ExportButtonProps {
  data: any[];
  filename: string;
  disabled?: boolean;
}

export function ExportButton({ data, filename, disabled }: ExportButtonProps) {
  const handleExport = () => {
    exportToCSV(data, filename);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || !data || data.length === 0}
      className="gap-2"
    >
      <Download className="w-4 h-4" />
      Export CSV
    </Button>
  );
}
