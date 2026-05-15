FROM nginx:alpine

# копируем сайт в html-папку
COPY . /usr/share/nginx/html

# шаблон nginx-конфига (НЕ в /etc/nginx/templates/, иначе автоскрипт сломает $uri)
COPY nginx.conf.template /tmp/nginx.conf.template

# чистим дефолтный конфиг и мусор из html
RUN rm -f /etc/nginx/conf.d/default.conf \
 && rm -f /usr/share/nginx/html/nginx.conf.template \
          /usr/share/nginx/html/Dockerfile \
          /usr/share/nginx/html/.dockerignore

# при старте подменяем ТОЛЬКО $PORT, остальные nginx-переменные не трогаем
CMD ["/bin/sh", "-c", "envsubst '$PORT' < /tmp/nginx.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
