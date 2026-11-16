package com.nulogic.api.knowledge.controller;

import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** DEF-FLUENCE-03: toDto reads lazy WikiSpace/parent, so every read endpoint that maps entities needs a session. */
class WikiPageControllerLazyReadTest {

    @Test
    void writeEndpointsMapDtosInsideATransaction() {
        assertThat(WikiPageController.class.isAnnotationPresent(Transactional.class)).isTrue();
    }

    @Test
    void singlePageAndChildReadsKeepSessionOpen() throws Exception {
        assertThat(WikiPageController.class.getMethod("getPageById", UUID.class)
                .isAnnotationPresent(Transactional.class)).isTrue();
        assertThat(WikiPageController.class.getMethod("getRootPages", UUID.class)
                .isAnnotationPresent(Transactional.class)).isTrue();
        assertThat(WikiPageController.class.getMethod("getChildPages", UUID.class)
                .isAnnotationPresent(Transactional.class)).isTrue();
    }
}
