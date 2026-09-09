import { EC2Client, StartInstancesCommand, StopInstancesCommand, DescribeInstancesCommand, RunInstancesCommand, TerminateInstancesCommand } from '@aws-sdk/client-ec2';
import { config } from '../config';

export class EC2Service {
  private client: EC2Client;

  constructor() {
    this.client = new EC2Client({
      region: config.AWS_REGION,
      credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  async startInstance(instanceId: string): Promise<{ success: boolean; state: string }> {
    const command = new StartInstancesCommand({ InstanceIds: [instanceId] });
    await this.client.send(command);
    return { success: true, state: 'pending' };
  }

  async stopInstance(instanceId: string): Promise<{ success: boolean; state: string }> {
    const command = new StopInstancesCommand({ InstanceIds: [instanceId] });
    await this.client.send(command);
    return { success: true, state: 'stopping' };
  }

  async terminateInstance(instanceId: string): Promise<{ success: boolean }> {
    const command = new TerminateInstancesCommand({ InstanceIds: [instanceId] });
    await this.client.send(command);
    return { success: true };
  }

  async getInstanceStatus(instanceId: string): Promise<{ state: string; ip: string | null }> {
    const command = new DescribeInstancesCommand({ InstanceIds: [instanceId] });
    const response = await this.client.send(command);
    const instance = response.Reservations?.[0]?.Instances?.[0];
    return {
      state: instance?.State?.Name || 'unknown',
      ip: instance?.PublicIpAddress || null,
    };
  }

  async createInstance(instanceType: string, amiId: string): Promise<{ instanceId: string }> {
    const command = new RunInstancesCommand({
      ImageId: amiId,
      InstanceType: instanceType as any,
      MinCount: 1,
      MaxCount: 1,
      SecurityGroupIds: [config.AWS_SECURITY_GROUP_ID],
      SubnetId: config.AWS_SUBNET_ID,
    });
    const response = await this.client.send(command);
    const instanceId = response.Instances?.[0]?.InstanceId;
    if (!instanceId) throw new Error('Failed to create instance');
    return { instanceId };
  }
}
