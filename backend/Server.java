import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;

public class Server {

    private static final String DB_URL = "jdbc:sqlite:./users.db";

    public static void main(String[] args) throws IOException {
        try {
            Class.forName("org.sqlite.JDBC");
        } catch (ClassNotFoundException e) {
            System.out.println("SQLite JDBC driver not found.");
            e.printStackTrace();
            return;
        }

        // Initialize SQLite database
        try (Connection conn = DriverManager.getConnection(DB_URL)) {
            if (conn != null) {
                // 创建用户表
                String createUsersTableSQL = "CREATE TABLE IF NOT EXISTS users (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                        "name TEXT NOT NULL," +
                        "role TEXT NOT NULL," +
                        "phone TEXT," +
                        "device TEXT," +
                        "usage_time TEXT," +
                        "openid TEXT UNIQUE," +
                        "avatar_url TEXT" +
                        ");";
                
                // 创建设备表
                String createDevicesTableSQL = "CREATE TABLE IF NOT EXISTS devices (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                        "name TEXT NOT NULL" +
                        ");";
                
                // 创建用户设备权限表
                String createUserDevicesTableSQL = "CREATE TABLE IF NOT EXISTS user_devices (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                        "user_id INTEGER NOT NULL," +
                        "device_id INTEGER NOT NULL," +
                        "FOREIGN KEY (user_id) REFERENCES users (id)," +
                        "FOREIGN KEY (device_id) REFERENCES devices (id)," +
                        "UNIQUE(user_id, device_id)" +
                        ");";
                
                // 创建预约表
                String createReservationsTableSQL = "CREATE TABLE IF NOT EXISTS reservations (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                        "device TEXT NOT NULL," +
                        "name TEXT NOT NULL," +
                        "date TEXT NOT NULL," +
                        "time TEXT NOT NULL," +
                        "UNIQUE(device, date, time)" +
                        ");";
                
                Statement stmt = conn.createStatement();
                stmt.execute(createUsersTableSQL);
                System.out.println("Users table created.");
                stmt.execute(createUserDevicesTableSQL);
                System.out.println("User_devices table created.");
                stmt.execute(createDevicesTableSQL);
                System.out.println("Devices table created.");
                stmt.execute(createReservationsTableSQL);
                System.out.println("Reservations table created.");
                
                System.out.println("Connected to SQLite database.");
                
                // 插入测试数据
                insertTestData(conn);
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }

        // Start HTTP server
        HttpServer server = HttpServer.create(new InetSocketAddress(3000), 0);

        // 微信登录接口
        server.createContext("/api/wx/login", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) throws IOException {
                if ("POST".equals(exchange.getRequestMethod())) {
                    // 读取请求体
                    String requestBody = new String(exchange.getRequestBody().readAllBytes());
                    System.out.println("收到登录请求: " + requestBody);
                    
                    try {
                        // 简单解析JSON（实际项目中应该使用JSON库）
                        String code = extractJsonValue(requestBody, "code");
                        String nickName = extractNestedJsonValue(requestBody, "userInfo", "nickName");
                        String avatarUrl = extractNestedJsonValue(requestBody, "userInfo", "avatarUrl");
                        
                        if (code == null || nickName == null) {
                            String errorResponse = "{\"code\": 400, \"msg\": \"Invalid request\"}";
                            exchange.sendResponseHeaders(400, errorResponse.getBytes().length);
                            OutputStream os = exchange.getResponseBody();
                            os.write(errorResponse.getBytes());
                            os.close();
                            return;
                        }
                        
                        // 模拟生成openid
                        String mockOpenid = "openid_" + code.substring(Math.max(0, code.length() - 6));
                        System.out.println("生成的openid: " + mockOpenid);
                        
                        try (Connection conn = DriverManager.getConnection(DB_URL)) {
                            // 检查用户是否已存在
                            String selectSQL = "SELECT * FROM users WHERE openid = ?";
                            var pstmt = conn.prepareStatement(selectSQL);
                            pstmt.setString(1, mockOpenid);
                            ResultSet rs = pstmt.executeQuery();
                            
                            String response;
                            if (rs.next()) {
                                // 用户已存在
                                System.out.println("数据库查询结果: 用户已存在");
                                response = String.format(
                                    "{\"code\": 200, \"data\": {\"token\": \"mock-token-%d\", " +
                                    "\"userInfo\": {\"id\": %d, \"name\": \"%s\", \"role\": \"%s\", " +
                                    "\"phone\": \"%s\", \"avatarUrl\": \"%s\"}, \"isNewUser\": false}}",
                                    rs.getInt("id"), rs.getInt("id"), rs.getString("name"),
                                    rs.getString("role"), 
                                    rs.getString("phone") != null ? rs.getString("phone") : "",
                                    rs.getString("avatar_url") != null ? rs.getString("avatar_url") : ""
                                );
                                System.out.println("返回已存在用户信息: " + response);
                            } else {
                                // 创建新用户
                                System.out.println("创建新用户: " + nickName + " " + mockOpenid);
                                String insertSQL = "INSERT INTO users (name, role, openid, avatar_url) VALUES (?, ?, ?, ?)";
                                var insertStmt = conn.prepareStatement(insertSQL, Statement.RETURN_GENERATED_KEYS);
                                insertStmt.setString(1, nickName);
                                insertStmt.setString(2, "user");
                                insertStmt.setString(3, mockOpenid);
                                insertStmt.setString(4, avatarUrl != null ? avatarUrl : "");
                                insertStmt.executeUpdate();
                                
                                ResultSet generatedKeys = insertStmt.getGeneratedKeys();
                                if (generatedKeys.next()) {
                                    int newUserId = generatedKeys.getInt(1);
                                    response = String.format(
                                        "{\"code\": 200, \"data\": {\"token\": \"mock-token-%d\", " +
                                        "\"userInfo\": {\"id\": %d, \"name\": \"%s\", \"role\": \"user\", " +
                                        "\"phone\": \"\", \"avatarUrl\": \"%s\"}, \"isNewUser\": true}}",
                                        newUserId, newUserId, nickName, avatarUrl != null ? avatarUrl : ""
                                    );
                                    System.out.println("返回新用户信息: " + response);
                                } else {
                                    throw new SQLException("Creating user failed, no ID obtained.");
                                }
                            }
                            
                            exchange.getResponseHeaders().set("Content-Type", "application/json");
                            exchange.sendResponseHeaders(200, response.getBytes().length);
                            OutputStream os = exchange.getResponseBody();
                            os.write(response.getBytes());
                            os.close();
                            
                        } catch (SQLException e) {
                            System.out.println("数据库查询错误: " + e.getMessage());
                            String errorResponse = "{\"code\": 500, \"msg\": \"Database error\"}";
                            exchange.sendResponseHeaders(500, errorResponse.getBytes().length);
                            OutputStream os = exchange.getResponseBody();
                            os.write(errorResponse.getBytes());
                            os.close();
                        }
                        
                    } catch (Exception e) {
                        System.out.println("处理登录请求时出错: " + e.getMessage());
                        String errorResponse = "{\"code\": 500, \"msg\": \"Internal server error\"}";
                        exchange.sendResponseHeaders(500, errorResponse.getBytes().length);
                        OutputStream os = exchange.getResponseBody();
                        os.write(errorResponse.getBytes());
                        os.close();
                    }
                } else {
                    exchange.sendResponseHeaders(405, -1);
                }
            }
        });

        // 获取设备列表接口
        server.createContext("/api/devices", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) throws IOException {
                if ("GET".equals(exchange.getRequestMethod())) {
                    try (Connection conn = DriverManager.getConnection(DB_URL)) {
                        String sql = "SELECT * FROM devices";
                        Statement stmt = conn.createStatement();
                        ResultSet rs = stmt.executeQuery(sql);
                        
                        StringBuilder devices = new StringBuilder("[");
                        boolean first = true;
                        while (rs.next()) {
                            if (!first) devices.append(",");
                            devices.append("{\"id\":").append(rs.getInt("id"))
                                   .append(",\"name\":\"").append(rs.getString("name")).append("\"}");
                            first = false;
                        }
                        devices.append("]");
                        
                        String response = "{\"code\": 200, \"data\": " + devices.toString() + "}";
                        exchange.getResponseHeaders().set("Content-Type", "application/json");
                        exchange.sendResponseHeaders(200, response.getBytes().length);
                        OutputStream os = exchange.getResponseBody();
                        os.write(response.getBytes());
                        os.close();
                    } catch (SQLException e) {
                        String errorResponse = "{\"code\": 500, \"msg\": \"Database error\"}";
                        exchange.sendResponseHeaders(500, errorResponse.getBytes().length);
                        OutputStream os = exchange.getResponseBody();
                        os.write(errorResponse.getBytes());
                        os.close();
                    }
                } else {
                    exchange.sendResponseHeaders(405, -1);
                }
            }
        });

        // 获取用户列表接口（管理员）
        server.createContext("/api/admin/users", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) throws IOException {
                if ("GET".equals(exchange.getRequestMethod())) {
                    try (Connection conn = DriverManager.getConnection(DB_URL)) {
                        String sql = "SELECT id, name, role, phone FROM users WHERE role != 'admin'";
                        Statement stmt = conn.createStatement();
                        ResultSet rs = stmt.executeQuery(sql);
                        
                        StringBuilder users = new StringBuilder("[");
                        boolean first = true;
                        while (rs.next()) {
                            if (!first) users.append(",");
                            users.append("{\"id\":").append(rs.getInt("id"))
                                 .append(",\"name\":\"").append(rs.getString("name"))
                                 .append("\",\"role\":\"").append(rs.getString("role"))
                                 .append("\",\"phone\":\"").append(rs.getString("phone") != null ? rs.getString("phone") : "")
                                 .append("\"}");
                            first = false;
                        }
                        users.append("]");
                        
                        String response = "{\"code\": 200, \"data\": " + users.toString() + "}";
                        exchange.getResponseHeaders().set("Content-Type", "application/json");
                        exchange.sendResponseHeaders(200, response.getBytes().length);
                        OutputStream os = exchange.getResponseBody();
                        os.write(response.getBytes());
                        os.close();
                    } catch (SQLException e) {
                        String errorResponse = "{\"code\": 500, \"msg\": \"Database error\"}";
                        exchange.sendResponseHeaders(500, errorResponse.getBytes().length);
                        OutputStream os = exchange.getResponseBody();
                        os.write(errorResponse.getBytes());
                        os.close();
                    }
                } else {
                    exchange.sendResponseHeaders(405, -1);
                }
            }
        });

        // 预约接口
        server.createContext("/api/reservations", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) throws IOException {
                if ("POST".equals(exchange.getRequestMethod())) {
                    // 读取请求体
                    String requestBody = new String(exchange.getRequestBody().readAllBytes());
                    System.out.println("收到预约请求: " + requestBody);
                    
                    try {
                        // 提取预约信息
                        String device = extractJsonValue(requestBody, "device");
                        String name = extractJsonValue(requestBody, "name");
                        String date = extractJsonValue(requestBody, "date");
                        String time = extractJsonValue(requestBody, "time");
                        
                        if (device == null || name == null || date == null || time == null) {
                            String errorResponse = "{\"code\": 400, \"msg\": \"Invalid request\"}";
                            exchange.sendResponseHeaders(400, errorResponse.getBytes().length);
                            OutputStream os = exchange.getResponseBody();
                            os.write(errorResponse.getBytes());
                            os.close();
                            return;
                        }
                        
                        try (Connection conn = DriverManager.getConnection(DB_URL)) {
                            // 检查预约冲突
                            String checkSQL = "SELECT COUNT(*) FROM reservations WHERE device = ? AND date = ? AND time = ?";
                            var checkStmt = conn.prepareStatement(checkSQL);
                            checkStmt.setString(1, device);
                            checkStmt.setString(2, date);
                            checkStmt.setString(3, time);
                            ResultSet rs = checkStmt.executeQuery();
                            
                            if (rs.next() && rs.getInt(1) > 0) {
                                // 预约冲突
                                String conflictResponse = "{\"code\": 409, \"msg\": \"该时间段已被预约\"}";
                                exchange.getResponseHeaders().set("Content-Type", "application/json");
                                exchange.sendResponseHeaders(409, conflictResponse.getBytes().length);
                                OutputStream os = exchange.getResponseBody();
                                os.write(conflictResponse.getBytes());
                                os.close();
                                return;
                            }
                            
                            // 插入预约记录
                            String insertSQL = "INSERT INTO reservations (device, name, date, time) VALUES (?, ?, ?, ?)";
                            var insertStmt = conn.prepareStatement(insertSQL);
                            insertStmt.setString(1, device);
                            insertStmt.setString(2, name);
                            insertStmt.setString(3, date);
                            insertStmt.setString(4, time);
                            insertStmt.executeUpdate();
                            
                            String response = "{\"code\": 200, \"msg\": \"预约成功\"}";
                            exchange.getResponseHeaders().set("Content-Type", "application/json");
                            exchange.sendResponseHeaders(200, response.getBytes().length);
                            OutputStream os = exchange.getResponseBody();
                            os.write(response.getBytes());
                            os.close();
                            
                        } catch (SQLException e) {
                            System.out.println("数据库错误: " + e.getMessage());
                            String errorResponse = "{\"code\": 500, \"msg\": \"Database error\"}";
                            exchange.sendResponseHeaders(500, errorResponse.getBytes().length);
                            OutputStream os = exchange.getResponseBody();
                            os.write(errorResponse.getBytes());
                            os.close();
                        }
                        
                    } catch (Exception e) {
                        System.out.println("处理预约请求时出错: " + e.getMessage());
                        String errorResponse = "{\"code\": 500, \"msg\": \"Internal server error\"}";
                        exchange.sendResponseHeaders(500, errorResponse.getBytes().length);
                        OutputStream os = exchange.getResponseBody();
                        os.write(errorResponse.getBytes());
                        os.close();
                    }
                } else {
                    exchange.sendResponseHeaders(405, -1);
                }
            }
        });

        // 获取用户设备权限接口
        server.createContext("/api/admin/user-devices/", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) throws IOException {
                if ("GET".equals(exchange.getRequestMethod())) {
                    String path = exchange.getRequestURI().getPath();
                    String[] parts = path.split("/");
                    if (parts.length >= 5) {
                        String userId = parts[4];
                        try (Connection conn = DriverManager.getConnection(DB_URL)) {
                            String sql = "SELECT device_id FROM user_devices WHERE user_id = " + userId;
                            Statement stmt = conn.createStatement();
                            ResultSet rs = stmt.executeQuery(sql);
                            
                            StringBuilder deviceIds = new StringBuilder("[");
                            boolean first = true;
                            while (rs.next()) {
                                if (!first) deviceIds.append(",");
                                deviceIds.append(rs.getInt("device_id"));
                                first = false;
                            }
                            deviceIds.append("]");
                            
                            String response = "{\"code\": 200, \"data\": " + deviceIds.toString() + "}";
                            exchange.getResponseHeaders().set("Content-Type", "application/json");
                            exchange.sendResponseHeaders(200, response.getBytes().length);
                            OutputStream os = exchange.getResponseBody();
                            os.write(response.getBytes());
                            os.close();
                        } catch (SQLException e) {
                            String errorResponse = "{\"code\": 500, \"msg\": \"Database error\"}";
                            exchange.sendResponseHeaders(500, errorResponse.getBytes().length);
                            OutputStream os = exchange.getResponseBody();
                            os.write(errorResponse.getBytes());
                            os.close();
                        }
                    } else {
                        exchange.sendResponseHeaders(400, -1);
                    }
                } else {
                    exchange.sendResponseHeaders(405, -1);
                }
            }
        });

        // 管理用户设备权限接口
        server.createContext("/api/admin/user-devices", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) throws IOException {
                if ("POST".equals(exchange.getRequestMethod())) {
                    // 处理用户设备权限管理逻辑
                    String response = "{\"code\": 200, \"msg\": \"Permission updated\"}";
                    exchange.getResponseHeaders().set("Content-Type", "application/json");
                    exchange.sendResponseHeaders(200, response.getBytes().length);
                    OutputStream os = exchange.getResponseBody();
                    os.write(response.getBytes());
                    os.close();
                } else {
                    exchange.sendResponseHeaders(405, -1);
                }
            }
        });

        server.createContext("/api/users/update", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) throws IOException {
                if ("PUT".equals(exchange.getRequestMethod())) {
                    // 处理用户信息更新逻辑
                    String response = "{\"code\": 200, \"msg\": \"User updated successfully\"}";
                    exchange.getResponseHeaders().set("Content-Type", "application/json");
                    exchange.sendResponseHeaders(200, response.getBytes().length);
                    OutputStream os = exchange.getResponseBody();
                    os.write(response.getBytes());
                    os.close();
                } else {
                    exchange.sendResponseHeaders(405, -1);
                }
            }
        });

        // 用户搜索接口（支持按姓名搜索）
        server.createContext("/api/users", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) throws IOException {
                if ("GET".equals(exchange.getRequestMethod())) {
                    String query = exchange.getRequestURI().getQuery();
                    String nameParam = "";
                    
                    if (query != null && query.contains("name=")) {
                        String[] params = query.split("&");
                        for (String param : params) {
                            if (param.startsWith("name=")) {
                                nameParam = param.substring(5); // 去掉 "name="
                                try {
                                    nameParam = java.net.URLDecoder.decode(nameParam, "UTF-8");
                                } catch (Exception e) {
                                    // 解码失败，使用原值
                                }
                                break;
                            }
                        }
                    }
                    
                    try (Connection conn = DriverManager.getConnection(DB_URL)) {
                        String sql;
                        if (nameParam.isEmpty()) {
                            sql = "SELECT id, name, role FROM users LIMIT 10";
                        } else {
                            sql = "SELECT id, name, role FROM users WHERE name LIKE '%" + nameParam + "%' LIMIT 10";
                        }
                        
                        Statement stmt = conn.createStatement();
                        ResultSet rs = stmt.executeQuery(sql);
                        
                        StringBuilder users = new StringBuilder("[");
                        boolean first = true;
                        while (rs.next()) {
                            if (!first) users.append(",");
                            users.append("{\"id\":").append(rs.getInt("id"))
                                 .append(",\"name\":\"").append(rs.getString("name"))
                                 .append("\",\"role\":\"").append(rs.getString("role"))
                                 .append("\"}");
                            first = false;
                        }
                        users.append("]");
                        
                        String response = "{\"code\": 200, \"data\": " + users.toString() + "}";
                        exchange.getResponseHeaders().set("Content-Type", "application/json");
                        exchange.sendResponseHeaders(200, response.getBytes().length);
                        OutputStream os = exchange.getResponseBody();
                        os.write(response.getBytes());
                        os.close();
                    } catch (SQLException e) {
                        String errorResponse = "{\"code\": 500, \"msg\": \"Database error\"}";
                        exchange.sendResponseHeaders(500, errorResponse.getBytes().length);
                        OutputStream os = exchange.getResponseBody();
                        os.write(errorResponse.getBytes());
                        os.close();
                    }
                } else {
                    exchange.sendResponseHeaders(405, -1);
                }
            }
        });

        // 用户信息更新接口（支持PUT方法）
        server.createContext("/api/users/", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) throws IOException {
                if ("PUT".equals(exchange.getRequestMethod())) {
                    String path = exchange.getRequestURI().getPath();
                    String[] parts = path.split("/");
                    if (parts.length >= 4) {
                        String userId = parts[3];
                        
                        // 读取请求体
                        String requestBody = new String(exchange.getRequestBody().readAllBytes());
                        System.out.println("收到用户更新请求: " + requestBody);
                        
                        try {
                            String name = extractJsonValue(requestBody, "name");
                            String phone = extractJsonValue(requestBody, "phone");
                            String role = extractJsonValue(requestBody, "role");
                            
                            try (Connection conn = DriverManager.getConnection(DB_URL)) {
                                String updateSQL = "UPDATE users SET name = ?, phone = ?, role = ? WHERE id = ?";
                                var updateStmt = conn.prepareStatement(updateSQL);
                                updateStmt.setString(1, name != null ? name : "");
                                updateStmt.setString(2, phone != null ? phone : "");
                                updateStmt.setString(3, role != null ? role : "user");
                                updateStmt.setInt(4, Integer.parseInt(userId));
                                
                                int rowsAffected = updateStmt.executeUpdate();
                                
                                String response;
                                if (rowsAffected > 0) {
                                    response = "{\"code\": 200, \"msg\": \"用户信息更新成功\"}";
                                } else {
                                    response = "{\"code\": 404, \"msg\": \"用户不存在\"}";
                                }
                                
                                exchange.getResponseHeaders().set("Content-Type", "application/json");
                                exchange.sendResponseHeaders(200, response.getBytes().length);
                                OutputStream os = exchange.getResponseBody();
                                os.write(response.getBytes());
                                os.close();
                                
                            } catch (SQLException e) {
                                System.out.println("数据库错误: " + e.getMessage());
                                String errorResponse = "{\"code\": 500, \"msg\": \"Database error\"}";
                                exchange.sendResponseHeaders(500, errorResponse.getBytes().length);
                                OutputStream os = exchange.getResponseBody();
                                os.write(errorResponse.getBytes());
                                os.close();
                            }
                            
                        } catch (Exception e) {
                            System.out.println("处理用户更新请求时出错: " + e.getMessage());
                            String errorResponse = "{\"code\": 500, \"msg\": \"Internal server error\"}";
                            exchange.sendResponseHeaders(500, errorResponse.getBytes().length);
                            OutputStream os = exchange.getResponseBody();
                            os.write(errorResponse.getBytes());
                            os.close();
                        }
                    } else {
                        exchange.sendResponseHeaders(400, -1);
                    }
                } else {
                    exchange.sendResponseHeaders(405, -1);
                }
            }
        });

        server.setExecutor(null); // creates a default executor
        server.start();
        System.out.println("Server running at http://localhost:3000");
    }

    // 插入测试数据的方法
    private static void insertTestData(Connection conn) {
        try {
            // 插入用户数据
            String insertUsersSQL = "INSERT OR IGNORE INTO users (name, role, phone, device, usage_time) VALUES " +
                    "('张三', '学生', '13800138001', '显微镜', '上午（8:00-12:00）'), " +
                    "('李四', '教师', '13800138002', '高温炉', '下午（13:00-17:00）'), " +
                    "('王五', '研究员', '13800138003', '电镜', '晚上（18:00-21:00）'), " +
                    "('赵六', '工程师', '13800138004', '3D打印机', '上午（8:00-12:00）'), " +
                    "('admin', 'admin', '13800138000', '', '')";
            
            // 插入设备数据
            String insertDevicesSQL = "INSERT OR IGNORE INTO devices (name) VALUES " +
                    "('显微镜'), ('高温炉'), ('电镜'), ('3D打印机')";
            
            Statement stmt = conn.createStatement();
            stmt.execute(insertUsersSQL);
            stmt.execute(insertDevicesSQL);
            
            System.out.println("Test data inserted successfully.");
            System.out.println("Devices test data inserted successfully.");
        } catch (SQLException e) {
            System.out.println("Error inserting test data: " + e.getMessage());
        }
    }
    
    // 简单的JSON值提取方法
    private static String extractJsonValue(String json, String key) {
        try {
            String pattern = "\"" + key + "\"\\s*:\\s*\"([^\"]+)\"";
            java.util.regex.Pattern p = java.util.regex.Pattern.compile(pattern);
            java.util.regex.Matcher m = p.matcher(json);
            if (m.find()) {
                return m.group(1);
            }
        } catch (Exception e) {
            System.out.println("Error extracting JSON value for key " + key + ": " + e.getMessage());
        }
        return null;
    }
    
    // 提取嵌套JSON值的方法
    private static String extractNestedJsonValue(String json, String parentKey, String childKey) {
        try {
            String pattern = "\"" + parentKey + "\"\\s*:\\s*\\{([^}]+)\\}";
            java.util.regex.Pattern p = java.util.regex.Pattern.compile(pattern);
            java.util.regex.Matcher m = p.matcher(json);
            if (m.find()) {
                String nested = m.group(1);
                return extractJsonValue("{" + nested + "}", childKey);
            }
        } catch (Exception e) {
            System.out.println("Error extracting nested JSON value for " + parentKey + "." + childKey + ": " + e.getMessage());
        }
        return null;
    }
}
