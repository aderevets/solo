// SPDX-License-Identifier: Apache-2.0

import {expect} from 'chai';
import {describe, it} from 'mocha';

import {ComponentsDataWrapper} from '../../../../../src/core/config/remote/components-data-wrapper.js';
import {SoloError} from '../../../../../src/core/errors/solo-error.js';
import {ComponentTypes} from '../../../../../src/core/config/remote/enumerations/component-types.js';
import {type NodeId} from '../../../../../src/types/aliases.js';
import {
  type ClusterReferenceName,
  type ComponentId,
  type NamespaceNameAsString,
} from '../../../../../src/types/index.js';
import {DeploymentPhase} from '../../../../../src/data/schema/model/remote/deployment-phase.js';
import {ComponentStateMetadataSchema} from '../../../../../src/data/schema/model/remote/state/component-state-metadata-schema.js';
import {LedgerPhase} from '../../../../../src/data/schema/model/remote/ledger-phase.js';
import {type ComponentsDataWrapperApi} from '../../../../../src/core/config/remote/api/components-data-wrapper-api.js';
import {RelayNodeStateSchema} from '../../../../../src/data/schema/model/remote/state/relay-node-state-schema.js';
import {HaProxyStateSchema} from '../../../../../src/data/schema/model/remote/state/ha-proxy-state-schema.js';
import {MirrorNodeStateSchema} from '../../../../../src/data/schema/model/remote/state/mirror-node-state-schema.js';
import {EnvoyProxyStateSchema} from '../../../../../src/data/schema/model/remote/state/envoy-proxy-state-schema.js';
import {ConsensusNodeStateSchema} from '../../../../../src/data/schema/model/remote/state/consensus-node-state-schema.js';
import {ExplorerStateSchema} from '../../../../../src/data/schema/model/remote/state/explorer-state-schema.js';
import {BlockNodeStateSchema} from '../../../../../src/data/schema/model/remote/state/block-node-state-schema.js';
import {DeploymentStateSchema} from '../../../../../src/data/schema/model/remote/deployment-state-schema.js';
import {RemoteConfigSchema} from '../../../../../src/data/schema/model/remote/remote-config-schema.js';
import {type K8} from '../../../../../src/integration/kube/k8.js';
import {type SoloLogger} from '../../../../../src/core/logging/solo-logger.js';
import {type PodReference} from '../../../../../src/integration/kube/resources/pod/pod-reference.js';

export function createComponentsDataWrapper(): {
  values: {
    id: ComponentId;
    cluster: ClusterReferenceName;
    namespace: NamespaceNameAsString;
    phase: DeploymentPhase.DEPLOYED;
    consensusNodeIds: NodeId[];
  };
  components: {
    relays: RelayNodeStateSchema[];
    haProxies: HaProxyStateSchema[];
    mirrorNodes: MirrorNodeStateSchema[];
    envoyProxies: EnvoyProxyStateSchema[];
    consensusNodes: ConsensusNodeStateSchema[];
    explorers: ExplorerStateSchema[];
    blockNodes: BlockNodeStateSchema[];
  };
  wrapper: {componentsDataWrapper: ComponentsDataWrapperApi};
  componentId: ComponentId;
} {
  const id: ComponentId = 1;
  const componentId: ComponentId = id;

  const cluster: ClusterReferenceName = 'cluster';
  const namespace: NamespaceNameAsString = 'namespace';
  const phase: DeploymentPhase = DeploymentPhase.DEPLOYED;
  const consensusNodeIds: NodeId[] = [0, 1];

  const metadata: ComponentStateMetadataSchema = new ComponentStateMetadataSchema(id, namespace, cluster, phase);

  const relays: RelayNodeStateSchema[] = [new RelayNodeStateSchema(metadata, consensusNodeIds)];
  const haProxies: HaProxyStateSchema[] = [new HaProxyStateSchema(metadata)];
  const mirrorNodes: MirrorNodeStateSchema[] = [new MirrorNodeStateSchema(metadata)];
  const envoyProxies: EnvoyProxyStateSchema[] = [new EnvoyProxyStateSchema(metadata)];
  const consensusNodes: ConsensusNodeStateSchema[] = [new ConsensusNodeStateSchema(metadata)];
  const explorers: ExplorerStateSchema[] = [new ExplorerStateSchema(metadata)];
  const blockNodes: BlockNodeStateSchema[] = [new BlockNodeStateSchema(metadata)];

  const deploymentState: DeploymentStateSchema = new DeploymentStateSchema(
    LedgerPhase.INITIALIZED,
    undefined,
    consensusNodes,
    blockNodes,
    mirrorNodes,
    relays,
    haProxies,
    envoyProxies,
    explorers,
  );

  const remoteConfig: RemoteConfigSchema = new RemoteConfigSchema(
    undefined,
    undefined,
    undefined,
    undefined,
    deploymentState,
  );

  const componentsDataWrapper: ComponentsDataWrapperApi = new ComponentsDataWrapper(remoteConfig.state);

  return {
    values: {id, cluster, namespace, phase, consensusNodeIds},
    components: {consensusNodes, haProxies, envoyProxies, mirrorNodes, explorers, relays, blockNodes},
    wrapper: {componentsDataWrapper},
    componentId,
  };
}

describe('ComponentsDataWrapper', () => {
  it('should be able to create a instance', () => createComponentsDataWrapper());

  it('should not be able to add new component with the .addNewComponent() method if it already exist', () => {
    const {
      wrapper: {componentsDataWrapper},
      components: {consensusNodes},
    } = createComponentsDataWrapper();

    const existingComponent: ConsensusNodeStateSchema = consensusNodes[0];

    expect(() => componentsDataWrapper.addNewComponent(existingComponent, ComponentTypes.ConsensusNode)).to.throw(
      SoloError,
      'Component exists',
    );
  });

  it('should be able to add new component with the .addNewComponent() method', () => {
    const {
      wrapper: {componentsDataWrapper},
    } = createComponentsDataWrapper();

    const newComponentId: ComponentId = 2;
    const {id, cluster, namespace, phase} = {
      id: newComponentId,
      cluster: 'cluster',
      namespace: 'new-namespace',
      phase: DeploymentPhase.DEPLOYED,
    };

    const metadata: ComponentStateMetadataSchema = new ComponentStateMetadataSchema(id, namespace, cluster, phase);
    const newComponent: EnvoyProxyStateSchema = new EnvoyProxyStateSchema(metadata);

    componentsDataWrapper.addNewComponent(newComponent, ComponentTypes.EnvoyProxy);

    expect(componentsDataWrapper.state.envoyProxies).to.have.lengthOf(2);
  });

  it('should be able to change node state with the .changeNodeState(()', () => {
    const {
      wrapper: {componentsDataWrapper},
      componentId,
    } = createComponentsDataWrapper();

    const newNodeState: DeploymentPhase = DeploymentPhase.STOPPED;

    componentsDataWrapper.changeNodePhase(componentId, newNodeState);

    expect(componentsDataWrapper.state.consensusNodes[0].metadata.phase).to.equal(newNodeState);
  });

  it("should not be able to edit component with the .editComponent() if it doesn't exist ", () => {
    const {
      wrapper: {componentsDataWrapper},
    } = createComponentsDataWrapper();
    const notFoundComponentId: ComponentId = 9;

    expect(() => componentsDataWrapper.changeNodePhase(notFoundComponentId, DeploymentPhase.FROZEN)).to.throw(
      SoloError,
      `Consensus node ${notFoundComponentId} doesn't exist`,
    );
  });

  it('should be able to remove component with the .removeComponent()', () => {
    const {
      wrapper: {componentsDataWrapper},
      components: {relays},
      componentId,
    } = createComponentsDataWrapper();

    componentsDataWrapper.removeComponent(componentId, ComponentTypes.RelayNodes);

    expect(relays).to.not.have.own.property(componentId.toString());
  });

  it("should not be able to remove component with the .removeComponent() if it doesn't exist ", () => {
    const {
      wrapper: {componentsDataWrapper},
    } = createComponentsDataWrapper();

    const notFoundComponentId: ComponentId = 9;

    expect(() => componentsDataWrapper.removeComponent(notFoundComponentId, ComponentTypes.RelayNodes)).to.throw(
      SoloError,
      `Component ${notFoundComponentId} of type ${ComponentTypes.RelayNodes} not found while attempting to remove`,
    );
  });

  it('should be able to get components with .getComponent()', () => {
    const {
      wrapper: {componentsDataWrapper},
      componentId,
      components: {mirrorNodes},
    } = createComponentsDataWrapper();

    const mirrorNodeComponent: MirrorNodeStateSchema = componentsDataWrapper.getComponent<MirrorNodeStateSchema>(
      ComponentTypes.MirrorNode,
      componentId,
    );

    expect(mirrorNodes.find((component): boolean => component.metadata.id === componentId).metadata.id).to.deep.equal(
      mirrorNodeComponent.metadata.id,
    );
  });

  it("should fail if trying to get component that doesn't exist with .getComponent()", () => {
    const {
      wrapper: {componentsDataWrapper},
    } = createComponentsDataWrapper();

    const notFoundComponentId: ComponentId = 9;
    const type: ComponentTypes = ComponentTypes.MirrorNode;

    expect(() => componentsDataWrapper.getComponent<MirrorNodeStateSchema>(type, notFoundComponentId)).to.throw(
      `Component ${notFoundComponentId} of type ${type} not found while attempting to read`,
    );
  });

  it('should fallback by node index when component id is missing in managePortForward()', async () => {
    const {
      wrapper: {componentsDataWrapper},
      values: {cluster, namespace},
    } = createComponentsDataWrapper();

    const metadata: ComponentStateMetadataSchema = new ComponentStateMetadataSchema(
      2,
      namespace,
      cluster,
      DeploymentPhase.DEPLOYED,
    );
    componentsDataWrapper.state.haProxies = [new HaProxyStateSchema(metadata)];

    const localPort: number = 50_211;
    const podPort: number = 50_211;
    const fakeK8Client: K8 = {
      pods: (): unknown => ({
        readByReference: (): unknown => ({
          portForward: async (): Promise<number> => localPort,
          stopPortForward: async (): Promise<void> => {},
        }),
      }),
    } as unknown as K8;
    const fakeLogger: SoloLogger = {
      showUser: (): void => {},
      addMessageGroup: (): void => {},
      addMessageGroupMessage: (): void => {},
      info: (): void => {},
      warn: (): void => {},
    } as unknown as SoloLogger;

    const forwardedPort: number = await componentsDataWrapper.managePortForward(
      undefined,
      {} as PodReference,
      podPort,
      localPort,
      fakeK8Client,
      fakeLogger,
      ComponentTypes.HaProxy,
      'Consensus Node gRPC',
      true,
      0,
      true,
    );

    expect(forwardedPort).to.equal(localPort);
    expect(componentsDataWrapper.state.haProxies[0].metadata.portForwardConfigs).to.deep.equal([
      {
        podPort,
        localPort,
      },
    ]);
  });
});
