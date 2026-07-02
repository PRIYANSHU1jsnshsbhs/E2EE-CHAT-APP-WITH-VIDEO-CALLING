package com.embarkx.e2eechatapp.Controller;

import com.embarkx.e2eechatapp.payload.MeetingTokenRequest;
import com.embarkx.e2eechatapp.payload.MeetingTokenResponse;
import com.embarkx.e2eechatapp.service.MeetingTokenService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/meetings")
@CrossOrigin("*")
public class MeetingController {

    private final MeetingTokenService meetingTokenService;

    public MeetingController(MeetingTokenService meetingTokenService) {
        this.meetingTokenService = meetingTokenService;
    }

    @PostMapping("/token")
    public ResponseEntity<MeetingTokenResponse> generateMeetingToken(@RequestBody MeetingTokenRequest request) {
        MeetingTokenResponse response = meetingTokenService.generateToken(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
