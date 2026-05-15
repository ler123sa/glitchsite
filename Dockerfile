FROM nginx:alpine

# копируем весь сайт
COPY . /usr/share/nginx/html

# убираем дефолтный конфиг nginx
RUN rm -f /etc/nginx/conf.d/default.conf

# наш шаблон конфига
RUN printf '%s\n' \
'server {' \
'  listen $PORT;' \
'  server_name _;' \
'  root /usr/share/nginx/html;' \
'  index index.html;' \
'' \
'  # gzip' \
'  gzip on;' \
'  gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;' \
'' \
'  # security headers' \
'  add_header X-Content-Type-Options "nosniff" always;' \
'  add_header Referrer-Policy "strict-origin-when-cross-origin" always;' \
'' \
'  # static cache' \
'  location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {' \
'    expires 7d;' \
'    add_header Cache-Control "public, max-age=604800";' \
'  }' \
'' \
'  # /login → /login.html (чистые URL)' \
'  location / {' \
'    try_files $uri $uri.html $uri/ =404;' \
'  }' \
'' \
'  # редирект .html → /clean (чтобы в адресной строке без .html)' \
'  if ($request_uri ~ ^/(.+)\.html$) {' \
'    return 301 /$1;' \
'  }' \
'' \
'  # 404' \
'  error_page 404 /index.html;' \
'}' \
> /etc/nginx/conf.d/default.conf.template

CMD ["/bin/sh", "-c", "envsubst '$PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
