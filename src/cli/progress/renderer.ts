import type { PipelineProgress, PipelineStage } from '../../domain/security-intelligence/orchestrator/types.js';

const STAGE_LABELS: Record<PipelineStage, string> = {
  'normalize': 'Normalization',
  'correlate': 'Correlation',
  'knowledge-graph': 'Knowledge Graph',
  'risk': 'Risk Assessment',
  'attack-path': 'Attack Path',
  'impact': 'Impact Analysis',
  'recommendation': 'Recommendation',
  'explain': 'Explainability',
  'report': 'Report Generation',
};

export class ProgressRenderer {
  private lastLine = '';

  render(progress: PipelineProgress): void {
    const stages = Object.entries(progress.stageStatuses) as [PipelineStage, string][];
    let output = '';

    for (const [stage, status] of stages) {
      const label = STAGE_LABELS[stage] ?? stage;
      const percentage = status === 'completed' ? 100 : status === 'running' ? Math.round(progress.percentage) : 0;
      const bar = this.progressBar(percentage, 20);
      const icon = status === 'completed' ? '✓' : status === 'running' ? '⟳' : status === 'failed' ? '✗' : '·';
      output += `${icon} ${label.padEnd(20)} ${bar} ${percentage}%\n`;
    }

    // Clear previous and write new
    if (this.lastLine) {
      process.stdout.write('\x1B[F'.repeat(this.lastLine.split('\n').length - 1));
    }
    process.stdout.write(output);
    this.lastLine = output;
  }

  clear(): void {
    if (this.lastLine) {
      const lines = this.lastLine.split('\n').length - 1;
      process.stdout.write('\x1B[F'.repeat(lines) + '\x1B[J');
    }
    this.lastLine = '';
  }

  private progressBar(percentage: number, width: number): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }
}
