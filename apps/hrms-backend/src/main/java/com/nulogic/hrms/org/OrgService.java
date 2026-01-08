package com.nulogic.hrms.org;

import com.nulogic.hrms.config.HrmsProperties;
import jakarta.persistence.EntityManager;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrgService {
    private final OrgRepository orgRepository;
    private final HrmsProperties properties;
    private final EntityManager entityManager;

    public OrgService(OrgRepository orgRepository, HrmsProperties properties, EntityManager entityManager) {
        this.orgRepository = orgRepository;
        this.properties = properties;
        this.entityManager = entityManager;
    }

    @Transactional
    public Org getOrCreateOrg() {
        UUID orgId = properties.getOrg().getId();
        return orgRepository.findById(orgId).orElseGet(() -> {
            Org org = new Org();
            org.setId(orgId);
            org.setName(properties.getOrg().getName());
            org.setDomain(properties.getOrg().getDomain());
            entityManager.persist(org);
            return org;
        });
    }
}
