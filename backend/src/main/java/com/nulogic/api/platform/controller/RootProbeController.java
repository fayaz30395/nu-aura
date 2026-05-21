package com.nulogic.api.platform.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RootProbeController {

    @RequestMapping(path = "/", method = {RequestMethod.GET, RequestMethod.HEAD})
    public ResponseEntity<Void> rootProbe() {
        return ResponseEntity.noContent().build();
    }
}
