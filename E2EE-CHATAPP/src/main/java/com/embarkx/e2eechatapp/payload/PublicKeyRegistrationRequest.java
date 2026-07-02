package com.embarkx.e2eechatapp.payload;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PublicKeyRegistrationRequest {

    private String roomId;
    private String userId;
    private String publicKey;

}