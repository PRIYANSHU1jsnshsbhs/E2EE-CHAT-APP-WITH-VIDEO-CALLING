package com.embarkx.e2eechatapp.payload;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MeetingTokenResponse {

    @JsonProperty("server_url")
    private String serverUrl;

    @JsonProperty("participant_token")
    private String participantToken;
}
