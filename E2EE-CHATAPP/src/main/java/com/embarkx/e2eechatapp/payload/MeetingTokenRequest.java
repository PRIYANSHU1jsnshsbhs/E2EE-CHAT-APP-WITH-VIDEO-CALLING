package com.embarkx.e2eechatapp.payload;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MeetingTokenRequest {

    @JsonProperty("room_name")
    @JsonAlias("roomName")
    private String roomName;

    @JsonProperty("participant_identity")
    @JsonAlias("participantIdentity")
    private String participantIdentity;

    @JsonProperty("participant_name")
    @JsonAlias("participantName")
    private String participantName;
}
