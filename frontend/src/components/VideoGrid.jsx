import { useRef, useEffect, useState } from 'react';
import { Box, Grid, Paper, Typography, Avatar, IconButton, Tooltip } from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';

function VideoCell({ member, stream, isLocal = false, localStream = null }) {
  const videoRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    const mediaStream = isLocal ? localStream : stream;
    
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
      
      // Check if stream has video track
      const videoTracks = mediaStream.getVideoTracks();
      setHasVideo(videoTracks.length > 0 && videoTracks[0].enabled);
      
      // Listen for track changes
      const handleTrackChange = () => {
        const tracks = mediaStream.getVideoTracks();
        setHasVideo(tracks.length > 0 && tracks[0]?.enabled);
      };
      
      mediaStream.addEventListener('addtrack', handleTrackChange);
      mediaStream.addEventListener('removetrack', handleTrackChange);
      
      return () => {
        mediaStream.removeEventListener('addtrack', handleTrackChange);
        mediaStream.removeEventListener('removetrack', handleTrackChange);
      };
    }
  }, [stream, localStream, isLocal]);

  // Update video visibility when member toggles video
  useEffect(() => {
    setHasVideo(member.videoEnabled);
  }, [member.videoEnabled]);

  const showVideo = hasVideo && member.videoEnabled;

  return (
    <Paper 
      sx={{ 
        position: 'relative',
        aspectRatio: '4/3',
        overflow: 'hidden',
        bgcolor: '#1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Mute local video to prevent echo
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: showVideo ? 'block' : 'none',
          transform: isLocal ? 'scaleX(-1)' : 'none' // Mirror local video
        }}
      />
      
      {/* Avatar fallback when video is off */}
      {!showVideo && (
        <Avatar 
          sx={{ 
            width: 80, 
            height: 80, 
            bgcolor: isLocal ? 'secondary.main' : 'primary.main',
            fontSize: '2rem',
            border: '3px solid',
            borderColor: isLocal ? 'secondary.light' : 'primary.light'
          }}
        >
          {member.username.charAt(0).toUpperCase()}
        </Avatar>
      )}
      
      {/* Username overlay */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
          p: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'white', 
            fontWeight: 'bold',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)'
          }}
          noWrap
        >
          {isLocal ? `${member.username} (You)` : member.username}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {member.micEnabled ? (
            <MicIcon sx={{ fontSize: 16, color: '#4caf50' }} />
          ) : (
            <MicOffIcon sx={{ fontSize: 16, color: '#f44336' }} />
          )}
          {member.videoEnabled ? (
            <VideocamIcon sx={{ fontSize: 16, color: '#4caf50' }} />
          ) : (
            <VideocamOffIcon sx={{ fontSize: 16, color: '#f44336' }} />
          )}
        </Box>
      </Box>
      
      {/* Speaking indicator ring */}
      {member.micEnabled && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            border: '2px solid transparent',
            borderRadius: 1,
            pointerEvents: 'none',
            '&.speaking': {
              borderColor: '#4caf50',
              boxShadow: '0 0 10px rgba(76, 175, 80, 0.5)'
            }
          }}
        />
      )}
    </Paper>
  );
}

export default function VideoGrid({ members = [], streams = {}, localStream = null, currentUsername = '' }) {
  // Find local member
  const localMember = members.find(m => m.username === currentUsername);
  const otherMembers = members.filter(m => m.username !== currentUsername);

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <VideocamIcon /> Participants ({members.length}/10)
      </Typography>
      
      <Grid container spacing={1}>
        {/* Local user first (self-view) */}
        {localMember && (
          <Grid item xs={6} sm={4} md={3} key={localMember.username}>
            <VideoCell 
              member={localMember} 
              stream={null}
              localStream={localStream}
              isLocal={true}
            />
          </Grid>
        )}
        
        {/* Other participants */}
        {otherMembers.map((member) => (
          <Grid item xs={6} sm={4} md={3} key={member.username}>
            <VideoCell 
              member={member} 
              stream={streams[member.socketId]} 
              isLocal={false}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}