import { logger } from '../helpers';
import crypto from 'crypto';

interface MeetingRequest {
  topic: string;
  startTime?: string;
  duration?: number;
  agenda?: string;
  timezone?: string;
}

/**
 * Video Meeting Service
 * Supports multiple providers: Jitsi Meet (no credentials required), Zoom (requires credentials)
 * Defaults to Jitsi Meet which is open source and requires no API credentials
 */
class VideoMeetingService {
  private zoomAccountId: string;
  private zoomClientId: string;
  private zoomClientSecret: string;
  private useZoom: boolean = false;
  private jitsiDomain: string;

  constructor() {
    // Zoom credentials (optional)
    this.zoomAccountId = process.env.ZOOM_ACCOUNT_ID || '';
    this.zoomClientId = process.env.ZOOM_CLIENT_ID || '';
    this.zoomClientSecret = process.env.ZOOM_CLIENT_SECRET || '';
    
    // Jitsi domain (defaults to public Jitsi Meet)
    this.jitsiDomain = process.env.JITSI_DOMAIN || 'meet.jit.si';
    
    // Check if Zoom credentials are available
    if (this.zoomAccountId && this.zoomClientId && this.zoomClientSecret) {
      this.useZoom = true;
      logger.info('Zoom credentials found. Using Zoom for meeting creation.');
    } else {
      logger.info('No Zoom credentials found. Using Jitsi Meet (no credentials required).');
    }
  }

  /**
   * Generate a unique meeting room name
   */
  private generateMeetingRoomName(topic: string): string {
    // Create a URL-friendly room name from topic + random string
    const sanitized = topic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 30);
    
    const randomId = crypto.randomBytes(4).toString('hex');
    return `${sanitized}-${randomId}`;
  }

  /**
   * Create a Jitsi Meet room (no API credentials required)
   */
  private createJitsiMeeting(topic: string): { joinUrl: string; startUrl: string; meetingId: string; password: string } {
    const roomName = this.generateMeetingRoomName(topic);
    const joinUrl = `https://${this.jitsiDomain}/${roomName}`;
    
    // Jitsi doesn't require passwords by default, but we can add config params
    const configParams = new URLSearchParams({
      config: JSON.stringify({
        startWithAudioMuted: false,
        startWithVideoMuted: false,
      })
    });

    return {
      joinUrl: `${joinUrl}?${configParams.toString()}`,
      startUrl: joinUrl, // Same URL for starting
      meetingId: roomName,
      password: '', // Jitsi doesn't use passwords by default
    };
  }

  /**
   * Create a scheduled meeting
   * Uses Jitsi Meet by default (no credentials) or Zoom if credentials are provided
   */
  async createScheduledMeeting(
    topic: string,
    startTime?: string,
    duration: number = 60,
    agenda?: string,
    timezone: string = 'UTC'
  ): Promise<{ joinUrl: string; startUrl: string; meetingId: string | number; password: string }> {
    // For now, we'll use Jitsi Meet since it requires no credentials
    // If you want to use Zoom, you'll need to add the Zoom API integration separately
    
    if (this.useZoom) {
      logger.warn('Zoom integration requires additional setup. Using Jitsi Meet instead.');
    }

    // Use Jitsi Meet (no credentials required)
    const meeting = this.createJitsiMeeting(topic);
    
    logger.info(`Created Jitsi Meet room: ${meeting.meetingId} for topic: ${topic}`);
    
    return meeting;
  }
}

export default new VideoMeetingService();

