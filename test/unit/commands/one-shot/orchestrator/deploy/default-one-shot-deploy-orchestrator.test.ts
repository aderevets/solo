// SPDX-License-Identifier: Apache-2.0

import {describe, it} from 'mocha';
import {expect} from 'chai';
import {DefaultOneShotDeployOrchestrator} from '../../../../../../src/commands/one-shot/orchestrator/deploy/default-one-shot-deploy-orchestrator.js';
import {NamespaceName} from '../../../../../../src/types/namespace/namespace-name.js';
import {type OneShotSingleDeployContext} from '../../../../../../src/commands/one-shot/one-shot-single-deploy-context.js';
import {DeploymentCommandDefinition} from '../../../../../../src/commands/command-definitions/deployment-command-definition.js';
import {type OneShotSingleDeployConfigClass} from '../../../../../../src/commands/one-shot/one-shot-single-deploy-config-class.js';
import {type CommandFlags} from '../../../../../../src/types/flag-types.js';
import {type AnyObject, type ArgvStruct} from '../../../../../../src/types/aliases.js';
import {type OrchestratorPipeline} from '../../../../../../src/commands/one-shot/orchestrator/orchestrator-pipeline.js';
import {type TaskList} from '../../../../../../src/core/task-list/task-list.js';
import {type SoloEventBus} from '../../../../../../src/core/events/solo-event-bus.js';
import {type AccountManager} from '../../../../../../src/core/account-manager.js';
import {type LocalConfigRuntimeState} from '../../../../../../src/business/runtime-state/config/local/local-config-runtime-state.js';
import {type RemoteConfigRuntimeStateApi} from '../../../../../../src/business/runtime-state/api/remote-config-runtime-state-api.js';
import {type SoloLogger} from '../../../../../../src/core/logging/solo-logger.js';
import {type ConfigManager} from '../../../../../../src/core/config-manager.js';
import {type OneShotState} from '../../../../../../src/core/one-shot-state.js';
import {type K8Factory} from '../../../../../../src/integration/kube/k8-factory.js';
import {type LockManager} from '../../../../../../src/core/lock/lock-manager.js';
import {type ComponentFactoryApi} from '../../../../../../src/core/config/remote/api/component-factory-api.js';

function buildOneShotConfig(): OneShotSingleDeployConfigClass {
  return {
    relayNodeConfiguration: {},
    explorerNodeConfiguration: {},
    blockNodeConfiguration: {},
    mirrorNodeConfiguration: {},
    consensusNodeConfiguration: {},
    networkConfiguration: {},
    setupConfiguration: {},
    valuesFile: '',
    clusterRef: 'one-shot',
    context: 'kind-solo-cluster',
    deployment: 'one-shot-recover',
    namespace: NamespaceName.of('rss-hiero-solo-primary-linux-large'),
    numberOfConsensusNodes: 1,
    cacheDir: '/tmp/solo-cache',
    predefinedAccounts: false,
    minimalSetup: false,
    deployMirrorNode: true,
    deployExplorer: true,
    deployRelay: true,
    deployMetricsServer: false,
    force: false,
    quiet: true,
    rollback: true,
    parallelDeploy: false,
    externalAddress: '',
    edgeEnabled: false,
    versions: {
      soloChart: '0.63.3',
      consensus: 'v0.71.0',
      mirror: 'v0.153.1',
      explorer: '26.0.0',
      relay: 'v0.0.0',
      blockNode: '0.31.0',
    },
    argv: {_: []} as unknown as ArgvStruct,
  };
}

describe('DefaultOneShotDeployOrchestrator', (): void => {
  it('skips deployment create and attach when deployment and cluster-ref already exist locally', async (): Promise<void> => {
    const oneShotConfig: OneShotSingleDeployConfigClass = buildOneShotConfig();

    const localConfigState: AnyObject = {
      deployments: [
        {
          name: oneShotConfig.deployment,
          namespace: oneShotConfig.namespace.name,
          clusters: [{toString: (): string => oneShotConfig.clusterRef}],
        },
      ],
    };

    const localConfigStub: AnyObject = {
      load: async (): Promise<void> => undefined,
      configuration: localConfigState,
    };

    const configManagerStub: AnyObject = {
      update: (): void => undefined,
      getFlag: (): unknown => false,
      setFlag: (): void => undefined,
      executePrompt: async (): Promise<void> => undefined,
      getConfig: (): OneShotSingleDeployConfigClass => oneShotConfig,
    };

    const taskListStub: TaskList<any> = {} as unknown as TaskList<any>;
    const eventBusStub: SoloEventBus = {} as unknown as SoloEventBus;
    const accountManagerStub: AccountManager = {} as unknown as AccountManager;
    const localConfigRuntimeStateStub: LocalConfigRuntimeState = localConfigStub as LocalConfigRuntimeState;
    const remoteConfigRuntimeStateStub: RemoteConfigRuntimeStateApi = {
      configuration: {components: {addNewComponent: (): void => undefined}},
    } as unknown as RemoteConfigRuntimeStateApi;
    const soloLoggerStub: SoloLogger = {
      addLogBindings: (): void => undefined,
      info: (): void => undefined,
    } as unknown as SoloLogger;
    const configManagerTypedStub: ConfigManager = configManagerStub as ConfigManager;
    const oneShotStateStub: OneShotState = {activate: (): void => undefined} as unknown as OneShotState;
    const k8FactoryStub: K8Factory = {
      default: (): AnyObject => ({contexts: (): AnyObject => ({readCurrent: (): string => oneShotConfig.context})}),
    } as unknown as K8Factory;
    const lockManagerStub: LockManager = {} as unknown as LockManager;
    const componentFactoryStub: ComponentFactoryApi = {} as unknown as ComponentFactoryApi;

    const orchestrator: DefaultOneShotDeployOrchestrator = new DefaultOneShotDeployOrchestrator(
      taskListStub,
      eventBusStub,
      accountManagerStub,
      localConfigRuntimeStateStub,
      remoteConfigRuntimeStateStub,
      soloLoggerStub,
      configManagerTypedStub,
      oneShotStateStub,
      k8FactoryStub,
      lockManagerStub,
      componentFactoryStub,
    );

    const commandFlags: CommandFlags = {required: [], optional: []};
    const pipeline: OrchestratorPipeline<OneShotSingleDeployContext> = orchestrator.buildDeployPipeline(
      {_: []} as unknown as ArgvStruct,
      commandFlags,
      {},
      {},
    );

    const initializeTask: AnyObject = pipeline.tasks[0] as AnyObject;
    const oneShotContext: OneShotSingleDeployContext = {} as OneShotSingleDeployContext;
    await initializeTask.task(oneShotContext, {} as AnyObject);

    const deploymentCreateTaskTitle: string = `solo ${DeploymentCommandDefinition.CREATE_COMMAND}`;
    const deploymentAttachTaskTitle: string = `solo ${DeploymentCommandDefinition.ATTACH_COMMAND}`;

    const deploymentCreateTask: AnyObject = pipeline.tasks.find(
      (taskItem: AnyObject): boolean => taskItem.title === deploymentCreateTaskTitle,
    );
    const deploymentAttachTask: AnyObject = pipeline.tasks.find(
      (taskItem: AnyObject): boolean => taskItem.title === deploymentAttachTaskTitle,
    );

    expect(deploymentCreateTask).to.not.equal(undefined);
    expect(deploymentAttachTask).to.not.equal(undefined);
    expect((deploymentCreateTask.skip as () => boolean)()).to.equal(true);
    expect((deploymentAttachTask.skip as () => boolean)()).to.equal(true);
  });
});
