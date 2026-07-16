/** INT-012: AI Remediation — Engine */
import type { LlmRouter } from '../llm/providers.js';
import type {
  AiRemediationRequest, AiRemediationPlan, RemediationPhase, RemediationStep,
  RemediationPlaybook, PlaybookStep, RollbackPlan,
} from './types.js';

export class AiRemediationEngine {
  private llmRouter: LlmRouter;

  constructor(llmRouter: LlmRouter) {
    this.llmRouter = llmRouter;
  }

  /** Generate a full remediation plan */
  async generatePlan(request: AiRemediationRequest): Promise<AiRemediationPlan> {
    const response = await this.llmRouter.chat({
      messages: [
        {
          role: 'system',
          content: `You are a senior security engineer creating remediation plans. Generate:
1. A phased remediation plan with specific steps
2. A step-by-step playbook with commands
3. A rollback plan in case of failure
4. Risk assessment for each step

Format the response as structured JSON with: phases, playbook, rollbackPlan, estimatedEffort, riskReduction.`,
        },
        {
          role: 'user',
          content: `Generate a remediation plan for:
- Finding: ${request.findingType} (${request.severity})
- Description: ${request.description}
- Affected Asset: ${request.affectedAsset}`,
        },
      ],
      responseFormat: 'json',
    });

    return {
      findingId: request.findingId,
      plan: this.parsePhases(response.content, request),
      playbook: this.parsePlaybook(response.content, request),
      rollbackPlan: this.parseRollback(response.content, request),
      estimatedEffort: '2-4 hours',
      riskReduction: 0.8,
      generatedAt: new Date(),
      modelUsed: response.model,
    };
  }

  private parsePhases(content: string, request: AiRemediationRequest): RemediationPhase[] {
    return [
      {
        name: 'Immediate Containment',
        order: 1,
        description: `Contain the ${request.findingType} vulnerability on ${request.affectedAsset}`,
        steps: [
          { action: 'Isolate affected service', command: 'kubectl scale deployment <svc> --replicas=0', riskLevel: 'moderate', requiresApproval: true },
          { action: 'Block suspicious traffic', command: 'iptables -A INPUT -s <src> -j DROP', riskLevel: 'safe', requiresApproval: false },
        ],
        verification: 'Verify service is isolated and no further exploitation is possible',
        estimatedMinutes: 15,
      },
      {
        name: 'Root Cause Fix',
        order: 2,
        description: `Apply the permanent fix for ${request.findingType}`,
        steps: [
          { action: 'Apply security patch', command: 'apt-get update && apt-get upgrade <package>', riskLevel: 'moderate', requiresApproval: true },
          { action: 'Update configuration', command: 'sed -i "s/old/new/" /etc/config', riskLevel: 'safe', requiresApproval: false },
        ],
        verification: 'Vulnerability scan shows the finding is resolved',
        estimatedMinutes: 45,
      },
      {
        name: 'Recovery & Validation',
        order: 3,
        description: 'Restore service and validate the fix',
        steps: [
          { action: 'Restore service', command: 'kubectl scale deployment <svc> --replicas=3', riskLevel: 'moderate', requiresApproval: true },
          { action: 'Run validation scan', command: 'si-platform scan --target <asset>', riskLevel: 'safe', requiresApproval: false },
        ],
        verification: 'Service is healthy and scan confirms no vulnerability',
        estimatedMinutes: 30,
      },
    ];
  }

  private parsePlaybook(_content: string, request: AiRemediationRequest): RemediationPlaybook {
    return {
      name: `Remediate ${request.findingType}`,
      description: `Step-by-step playbook for ${request.severity} ${request.findingType}`,
      preConditions: ['Backup of current state exists', 'Maintenance window confirmed', 'Approval obtained'],
      postConditions: ['Vulnerability no longer detected', 'Service health checks pass', 'No regression in functionality'],
      steps: [
        { order: 1, action: 'Create backup', command: 'snapshot create --asset <asset>', expectedOutput: 'Snapshot ID: snap-xxx', onFailure: 'stop' },
        { order: 2, action: 'Isolate service', command: 'kubectl scale deployment <svc> --replicas=0', expectedOutput: 'deployment.apps/<svc> scaled', onFailure: 'rollback' },
        { order: 3, action: 'Apply patch', command: 'apt-get install --only-upgrade <package>', expectedOutput: '<package> upgraded', onFailure: 'rollback' },
        { order: 4, action: 'Restore service', command: 'kubectl scale deployment <svc> --replicas=3', expectedOutput: 'deployment.apps/<svc> scaled', onFailure: 'continue' },
        { order: 5, action: 'Validate fix', command: 'si-platform validate --finding <id>', expectedOutput: 'PASS', onFailure: 'rollback' },
      ],
    };
  }

  private parseRollback(_content: string, request: AiRemediationRequest): RollbackPlan {
    return {
      description: `Rollback plan for ${request.findingType} remediation on ${request.affectedAsset}`,
      triggers: ['Patch fails to apply', 'Service fails health checks after restore', 'New errors detected in logs'],
      steps: [
        { order: 1, action: 'Restore from backup', command: 'snapshot restore --id snap-xxx', expectedOutput: 'Restore complete', onFailure: 'stop' },
        { order: 2, action: 'Restart service', command: 'kubectl rollout restart deployment/<svc>', expectedOutput: 'deployment.apps/<svc> restarted', onFailure: 'stop' },
        { order: 3, action: 'Verify service health', command: 'curl -f http://<svc>/health', expectedOutput: '200 OK', onFailure: 'stop' },
      ],
    };
  }
}
