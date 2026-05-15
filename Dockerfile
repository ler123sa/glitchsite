FROM nginx:alpine

# убираем дефолтный конфиг nginx
RUN rm -f /etc/nginx/conf.d/default.conf

# копируем шаблон nginx
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# копируем весь сайт
COPY . /usr/share/nginx/html

# чистим лишнее из веб-рута
RUN rm -f /usr/share/nginx/html/Dockerfile \
           /usr/share/nginx/html/.dockerignore \
           /usr/share/nginx/html/nginx.conf.template

# Railway даёт $PORT через env
ENV PORT=8080

CMD ["/bin/sh", "-c", "envsubst '$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
