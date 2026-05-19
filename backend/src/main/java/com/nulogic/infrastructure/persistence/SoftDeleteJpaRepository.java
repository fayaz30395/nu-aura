package com.nulogic.infrastructure.persistence;

import com.nulogic.common.entity.BaseEntity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.jpa.repository.support.JpaEntityInformation;
import org.springframework.data.jpa.repository.support.SimpleJpaRepository;
import org.springframework.data.util.ProxyUtils;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.Assert;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * Spring Data JPA base repository that routes every delete path through
 * {@link BaseEntity#softDelete()} so audit history is preserved. Wired via
 * {@code @EnableJpaRepositories(repositoryBaseClass = SoftDeleteJpaRepository.class)}.
 *
 * <p>Behaviour:
 * <ul>
 *     <li>Entities extending {@link BaseEntity} are soft-deleted with an
 *         {@code UPDATE … SET is_deleted = true, deleted_at = now()} per row
 *         (or a bulk JPQL update for batch variants).</li>
 *     <li>Entities that do <strong>not</strong> extend {@link BaseEntity}
 *         (e.g. wall {@code PostComment}, {@code PollVote}, {@code PollOption},
 *         lms {@code LearningPathCourse}) fall back to the upstream physical
 *         delete from {@link SimpleJpaRepository}. Those tables either manage
 *         their own soft-delete columns or are intended to be hard-deleted.</li>
 * </ul>
 *
 * <p>Backlog reference: T1-05 — single-route delete contract.
 */
@Repository
@Transactional(readOnly = true)
public class SoftDeleteJpaRepository<T, ID> extends SimpleJpaRepository<T, ID> {

    private static final Logger log = LoggerFactory.getLogger(SoftDeleteJpaRepository.class);

    private static final String SOFT_DELETE_BY_ID_JPQL =
            "UPDATE %s e SET e.isDeleted = true, e.deletedAt = :deletedAt WHERE e.id = :id AND e.isDeleted = false";
    private static final String SOFT_DELETE_BY_IDS_JPQL =
            "UPDATE %s e SET e.isDeleted = true, e.deletedAt = :deletedAt WHERE e.id IN :ids AND e.isDeleted = false";
    private static final String SOFT_DELETE_ALL_JPQL =
            "UPDATE %s e SET e.isDeleted = true, e.deletedAt = :deletedAt WHERE e.isDeleted = false";

    private final EntityManager em;
    private final Class<T> domainClass;
    private final boolean softDeleteCapable;

    public SoftDeleteJpaRepository(JpaEntityInformation<T, ?> entityInformation, EntityManager entityManager) {
        super(entityInformation, entityManager);
        this.em = entityManager;
        this.domainClass = entityInformation.getJavaType();
        this.softDeleteCapable = BaseEntity.class.isAssignableFrom(this.domainClass);
    }

    public SoftDeleteJpaRepository(Class<T> domainClass, EntityManager entityManager) {
        super(domainClass, entityManager);
        this.em = entityManager;
        this.domainClass = domainClass;
        this.softDeleteCapable = BaseEntity.class.isAssignableFrom(domainClass);
    }

    @Override
    @Transactional
    public void delete(T entity) {
        Assert.notNull(entity, "Entity must not be null");
        if (!softDeleteCapable) {
            super.delete(entity);
            return;
        }
        BaseEntity managed = resolveManaged(entity);
        if (managed == null) {
            return;
        }
        if (managed.isDeleted()) {
            log.debug("soft-delete skipped (already deleted) on {} id={}",
                    domainClass.getSimpleName(), managed.getId());
            return;
        }
        managed.softDelete();
        em.merge(managed);
        log.debug("soft-delete on {} id={}", domainClass.getSimpleName(), managed.getId());
    }

    @Override
    @Transactional
    public void deleteAll(Iterable<? extends T> entities) {
        Assert.notNull(entities, "Entities must not be null");
        for (T entity : entities) {
            delete(entity);
        }
    }

    @Override
    @Transactional
    public void deleteAllInBatch(Iterable<T> entities) {
        Assert.notNull(entities, "Entities must not be null");
        if (!entities.iterator().hasNext()) {
            return;
        }
        if (!softDeleteCapable) {
            super.deleteAllInBatch(entities);
            return;
        }
        List<Object> ids = new ArrayList<>();
        for (T entity : entities) {
            BaseEntity be = (BaseEntity) entity;
            if (be.getId() != null) {
                ids.add(be.getId());
            }
        }
        if (ids.isEmpty()) {
            return;
        }
        int updated = bulkSoftDeleteByIds(ids);
        log.debug("soft-delete batch on {} count={}", domainClass.getSimpleName(), updated);
    }

    @Override
    @Transactional
    public void deleteAllInBatch() {
        if (!softDeleteCapable) {
            super.deleteAllInBatch();
            return;
        }
        String jpql = String.format(SOFT_DELETE_ALL_JPQL, entityName());
        Query query = em.createQuery(jpql);
        query.setParameter("deletedAt", LocalDateTime.now());
        int updated = query.executeUpdate();
        log.debug("soft-delete all on {} count={}", domainClass.getSimpleName(), updated);
    }

    @Override
    @Transactional
    public void deleteAllByIdInBatch(Iterable<ID> ids) {
        Assert.notNull(ids, "Ids must not be null");
        if (!ids.iterator().hasNext()) {
            return;
        }
        if (!softDeleteCapable) {
            super.deleteAllByIdInBatch(ids);
            return;
        }
        List<Object> idList = new ArrayList<>();
        ids.forEach(idList::add);
        int updated = bulkSoftDeleteByIds(idList);
        log.debug("soft-delete by ids on {} count={}", domainClass.getSimpleName(), updated);
    }

    private int bulkSoftDeleteByIds(Collection<?> ids) {
        String jpql = String.format(SOFT_DELETE_BY_IDS_JPQL, entityName());
        Query query = em.createQuery(jpql);
        query.setParameter("deletedAt", LocalDateTime.now());
        query.setParameter("ids", ids);
        return query.executeUpdate();
    }

    private BaseEntity resolveManaged(T entity) {
        BaseEntity be = (BaseEntity) entity;
        if (em.contains(be)) {
            return be;
        }
        Class<?> userClass = ProxyUtils.getUserClass(entity);
        Object existing = em.find(userClass, be.getId());
        return existing == null ? null : (BaseEntity) existing;
    }

    private String entityName() {
        // Hibernate's default entity name == simple class name unless overridden via @Entity(name = "...")
        return domainClass.getSimpleName();
    }
}
