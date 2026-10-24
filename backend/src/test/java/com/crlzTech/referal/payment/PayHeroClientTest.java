package com.crlzTech.referal.payment;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestTemplate;
import org.springframework.test.web.client.MockRestServiceServer;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

class PayHeroClientTest {

    @Test
    void usesTheCurrentPaymentsEndpointAndNumericChannelId() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        PayHeroClient client = new PayHeroClient(
                restTemplate,
                true,
                "https://backend.payhero.co.ke/api/v2",
                "/payments/initiate-stk-push",
                "api-user",
                "api-password",
                "133",
                "https://example.com/api/payments/callback",
                "");

        server.expect(requestTo("https://backend.payhero.co.ke/api/v2/payments"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Basic YXBpLXVzZXI6YXBpLXBhc3N3b3Jk"))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().json("""
                        {
                          "amount": 500,
                          "phone_number": "254712345678",
                          "channel_id": 133,
                          "external_reference": "PAY-123",
                          "provider": "m-pesa",
                          "callback_url": "https://example.com/api/payments/callback"
                        }
                        """))
                .andRespond(withStatus(HttpStatus.CREATED)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"success\":true,\"status\":\"QUEUED\",\"reference\":\"PH-123\"}"));

        assertEquals("PH-123", client.initiateStkPush(
                "+254 712 345 678", new BigDecimal("500.00"), "PAY-123"));
        server.verify();
    }
}
