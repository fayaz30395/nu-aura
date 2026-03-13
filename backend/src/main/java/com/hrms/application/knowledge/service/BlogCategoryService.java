package com.hrms.application.knowledge.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.knowledge.BlogCategory;
import com.hrms.infrastructure.knowledge.repository.BlogCategoryRepository;
import com.hrms.infrastructure.knowledge.repository.BlogPostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class BlogCategoryService {

    private final BlogCategoryRepository blogCategoryRepository;
    private final BlogPostRepository blogPostRepository;

    public BlogCategory createCategory(BlogCategory category) {
        UUID tenantId = TenantContext.getCurrentTenant();
        category.setTenantId(tenantId);

        BlogCategory saved = blogCategoryRepository.save(category);
        log.info("Created blog category: {}", saved.getId());
        return saved;
    }

    public BlogCategory updateCategory(UUID categoryId, BlogCategory categoryData) {
        UUID tenantId = TenantContext.getCurrentTenant();

        BlogCategory category = blogCategoryRepository.findById(categoryId)
            .filter(c -> c.getTenantId().equals(tenantId))
            .orElseThrow(() -> new IllegalArgumentException("Category not found"));

        category.setName(categoryData.getName());
        category.setSlug(categoryData.getSlug());
        category.setDescription(categoryData.getDescription());
        category.setColor(categoryData.getColor());
        category.setIcon(categoryData.getIcon());
        category.setOrderIndex(categoryData.getOrderIndex());

        BlogCategory updated = blogCategoryRepository.save(category);
        log.info("Updated blog category: {}", categoryId);
        return updated;
    }

    @Transactional(readOnly = true)
    public BlogCategory getCategoryById(UUID categoryId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return blogCategoryRepository.findById(categoryId)
            .filter(c -> c.getTenantId().equals(tenantId))
            .orElseThrow(() -> new IllegalArgumentException("Category not found"));
    }

    @Transactional(readOnly = true)
    public BlogCategory getCategoryBySlug(String slug) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return blogCategoryRepository.findByTenantIdAndSlug(tenantId, slug)
            .orElseThrow(() -> new IllegalArgumentException("Category not found"));
    }

    @Transactional(readOnly = true)
    public Page<BlogCategory> getAllCategories(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return blogCategoryRepository.findByTenantId(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public List<BlogCategory> getAllCategoriesOrdered() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return blogCategoryRepository.findCategoriesByTenantOrderByIndex(tenantId);
    }

    public void deleteCategory(UUID categoryId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        BlogCategory category = blogCategoryRepository.findById(categoryId)
            .filter(c -> c.getTenantId().equals(tenantId))
            .orElseThrow(() -> new IllegalArgumentException("Category not found"));

        blogCategoryRepository.delete(category);
        log.info("Deleted blog category: {}", categoryId);
    }

    @Transactional(readOnly = true)
    public long getPostCountByCategory(UUID categoryId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return blogPostRepository.countByTenantIdAndCategoryId(tenantId, categoryId);
    }
}
