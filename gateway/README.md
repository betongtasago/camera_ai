# MediaMTX gateway cho camera TNT

Bộ cấu hình này chạy MediaMTX trên máy có thể truy cập camera RTSP trong mạng LAN, sau đó dùng Caddy cấp HTTPS cho HLS/WebRTC để dashboard Vercel có thể phát luồng mà không bị trình duyệt chặn mixed content.

## Điều kiện

Máy gateway cần chạy Docker, truy cập được `192.168.70.130:554` và có DNS public trỏ về máy gateway. Mở TCP `80/443`; giữ MediaMTX port `8554`, `8888`, `8889` chỉ trong mạng nội bộ nếu không cần truy cập trực tiếp. WebRTC cần thêm UDP/TCP `8189` từ client đến gateway; nếu mạng có NAT khó đi xuyên, cấu hình TURN theo tài liệu MediaMTX.

## Cài đặt

```bash
cp .env.example .env
# Sửa GATEWAY_HOST, GATEWAY_DOMAIN và các CAM*_RTSP_URL trong .env
docker compose up -d

docker compose logs -f mediamtx
```

Kiểm tra:

```bash
curl -fsS https://$GATEWAY_DOMAIN/healthz
# HLS playlist của camera 1:
curl -I https://$GATEWAY_DOMAIN/hls/cam01/index.m3u8
```

MediaMTX sẽ kéo camera theo yêu cầu khi có trình duyệt đọc path. Nếu camera phát H.265 hoặc H.264 có B-frames, WebRTC có thể không phát trên Chrome/Safari; khi đó cần thêm bước FFmpeg chuyển mã H.264 baseline hoặc dùng HLS.

## Nhập vào ứng dụng

Trong **Cấu hình IP → camera**, chọn loại stream `HLS / WebRTC` và nhập:

```text
https://<GATEWAY_DOMAIN>/hls/cam01/index.m3u8
```

Giữ IP camera, port RTSP, username và password để nút **Kiểm tra kết nối IP** vẫn chẩn đoán camera gốc. Stream URL là URL HTTPS của gateway, không phải RTSP URL.

## Bảo mật

Không commit `.env`. Không đặt camera password vào `mediamtx.yml` hoặc Caddyfile. Nếu gateway public, nên giới hạn firewall, thêm authentication ở reverse proxy hoặc dùng VPN/Tailscale; không mở port RTSP camera ra Internet.
