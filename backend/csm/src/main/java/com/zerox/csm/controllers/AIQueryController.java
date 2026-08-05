package com.zerox.csm.controllers;


import com.zerox.csm.dto.AIQueryRequest;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.hibernate.query.NativeQuery;
import org.hibernate.transform.Transformers;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/ai")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')") 
public class AIQueryController {

    private final EntityManager entityManager;

    @PostMapping("/query")
    public ResponseEntity<?> executeAIQuery(@RequestBody AIQueryRequest request) {
        String cleanSql = request.getSqlQuery();
        
        if (cleanSql == null || cleanSql.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Query target parameter string cannot be empty.");
        }

        // 🛡️ CRITICAL SECURITY GUARDRAIL: Proactively intercept mutation sequences
        String uppercaseSql = cleanSql.toUpperCase().trim();
        if (!uppercaseSql.startsWith("SELECT") || 
            uppercaseSql.contains("DROP") || 
            uppercaseSql.contains("DELETE") || 
            uppercaseSql.contains("UPDATE") || 
            uppercaseSql.contains("INSERT") || 
            uppercaseSql.contains("ALTER") || 
            uppercaseSql.contains("TRUNCATE")) {
            
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Security Violation: Read-only SELECT operations allowed.");
        }

        try {
            // Unpack Hibernate's native session query adapter
            org.hibernate.Session session = entityManager.unwrap(org.hibernate.Session.class);
            
            // Assemble native query interface matching text layout parameters
            NativeQuery<?> nativeQuery = session.createNativeQuery(cleanSql);
            
            // Force mapping rows into Map structures (Column Name -> Value) instead of raw Object[] index lists
            nativeQuery.setResultTransformer(Transformers.ALIAS_TO_ENTITY_MAP);
            
            List<?> queryResults = nativeQuery.getResultList();
            return ResponseEntity.ok(queryResults);
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Database Execution Trace Failure: " + e.getMessage());
        }
    }
}